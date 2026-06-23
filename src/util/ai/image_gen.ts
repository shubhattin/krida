import { generateImage, generateText, Output } from 'ai';
import type { OpenAIImageModelGenerationOptions } from '@ai-sdk/openai';
import { z } from 'zod';
import { image_assets } from '~/db/schema';
import type { db } from '~/db/db';
import { resizeImage } from '~/util/sharp/resize.server';
import { uploadAssetFile, deleteAssetFile } from '~/util/s3/upload_file.server';
import { PROJECT_S3_ALIAS } from '~/constants';
import { openai, openrouter } from './providers';
import crypto from 'node:crypto';

/**
 * Final stored dimensions after sharp resize/compress.
 * Keeps exact 3:2 ratio at a web-friendly resolution.
 * Width × Height in pixels → 768 × 512 px.
 */
const IMAGE_CONFIG = {
  HEIGHT: 512,
  WIDTH: 768,
  ASPECT_RATIO: '3:2'
} as const;

const OPENROUTER_MODELS = {
  image_prompt: 'openai/gpt-5.4',
  file_name: 'openai/gpt-5.4-nano',
  image_generation: 'openai/gpt-5.4-image-2'
} as const;

const OPENAI_MODELS = {
  image_generation: 'gpt-image-2'
} as const;

const IMAGE_PROMPT_SYSTEM = `
You are an expert at crafting image generation prompts for Sanskrit language-learning puzzle cards.

Your task is to create a detailed, vivid image prompt for a given Sanskrit puzzle title/theme.

**Art style rules:**
- Modern flat-illustration style with rich, warm color palettes (saffron, ochre, deep teal, ivory, crimson, gold).
- Inspired by Indian miniature painting aesthetics combined with clean modern graphic design.
- Picture-book illustration quality — bold outlines, no photo-realism.
- NO text, letters, or inscriptions anywhere in the image.
- NO borders, frames, or decorative margins.
- Do not mess up the gender of the subject (devi, deva, etc.).
- Make sure to also include the subject even you include things related to it. That describe it or so
- You dont always have to include a temple in background only do if it its needed and fits/suits the theme.

**Composition rules:**
- LANDSCAPE orientation (wider than tall, 3:2 aspect ratio).
- Primary subject must be strongly centered — both vertically and horizontally — so it remains prominent even if the image is cropped to a square.
- The composition should still use the full width: flanking elements (decorative motifs, background scenery) can extend to the edges, but must not compete with the center subject.
- Foreground should have depth; avoid flat, single-layer compositions.

**Indian-context guardrails:**
- All visual references must be drawn from Indian/Hindu Dharma traditions: deities, temples, nature, Sanskrit wisdom themes, Vedic motifs, classical Indian music/dance, Indian flora/fauna, traditional crafts, etc.
- Avoid any Western, Chinese, or non-Indian cultural symbols.
- Use Indian cities, landscapes, or architectural styles when context suggests it.

**Output schema:**
- image_prompt: A single, detailed English paragraph (≤ 150 words) suitable for direct use in an image model.
`.trim();

const IMAGE_PROMPT_USER = `
Generate an image prompt for the following Sanskrit puzzle:

Title: "{title}"
Description: "{description}"
`.trim();

export const generate_puzzle_image_input_schema = z.object({
  /** Puzzle title in Sanskrit (shown to the LLM for prompt context) */
  title: z.string().min(1),
  /** Optional short English description of the puzzle for extra context */
  description: z.string().optional(),
  /** Sanskrit words in the puzzle to provide richer context for prompt generation */
  words: z.array(z.string()).optional(),
  /** Supply a pre-written image prompt to skip the prompt-generation step */
  existing_image_prompt: z.string().optional()
});
export type GeneratePuzzleImageInput = z.infer<typeof generate_puzzle_image_input_schema>;
export const generate_puzzle_image_output_schema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    time_ms: z.int(),
    id: z.int(),
    s3_key: z.string(),
    image_prompt: z.string(),
    description: z.string().optional()
  }),
  z.object({
    success: z.literal(false),
    err_code: z.enum(['image_upload_failed', 'image_generation_failed'])
  })
]);
export type GeneratePuzzleImageOutput = z.infer<typeof generate_puzzle_image_output_schema>;

async function generatePuzzleCardImage(image_prompt: string): Promise<string> {
  const image_model = openai.image(OPENAI_MODELS.image_generation);

  const result = await generateImage({
    model: image_model,
    prompt: image_prompt,
    aspectRatio: IMAGE_CONFIG.ASPECT_RATIO,
    providerOptions: {
      openai: {
        quality: 'medium'
      } satisfies OpenAIImageModelGenerationOptions
    }
  });

  // GeneratedFile.base64 gives the raw base64 string (no data-URL prefix)
  return result.image.base64;
}

export const generateImagePrompt = async (title: string, description?: string): Promise<string> => {
  const user_prompt = IMAGE_PROMPT_USER.replace('{title}', title).replace(
    '{description}',
    description ?? ''
  );
  const response = await generateText({
    model: openrouter(OPENROUTER_MODELS.image_prompt),
    output: Output.object({
      schema: z.object({
        image_prompt: z
          .string()
          .describe('A detailed English image prompt (≤150 words) for a puzzle card illustration.')
      })
    }),
    system: IMAGE_PROMPT_SYSTEM,
    prompt: user_prompt
  });
  return response.output.image_prompt;
};

export const generateFileNameAndDescription = async (
  image_prompt: string
): Promise<{ file_name: string; description: string }> => {
  const response = await generateText({
    model: openrouter(OPENROUTER_MODELS.file_name),
    output: Output.object({
      schema: z.object({
        file_name: z
          .string()
          .describe(
            'A short file_name (2–4 words, underscores, lowercase) for the image prompt provided.'
          ),
        description: z.string().describe('A 3–5 word description for the image prompt provided.')
      })
    }),
    system:
      'Generate a short file_name (2–4 words, underscores, lowercase) and a 3–5 word description for the image prompt provided.',
    prompt: image_prompt
  });
  return response.output;
};

export const generatePuzzleImage = async (
  input: GeneratePuzzleImageInput,
  db_instance: typeof db,
  existing_image_b64?: string,
  existing_file_name_description?: { file_name: string; description: string }
): Promise<GeneratePuzzleImageOutput> => {
  const start_time = Date.now();
  const { title, description, existing_image_prompt } = input;

  // ------------------------------------------------------------------
  // Step 1 — Generate image prompt (or use supplied one)
  // ------------------------------------------------------------------
  let image_prompt: string;
  let file_name: string;
  let image_description: string;

  // ------------------------------------------------------------------
  // Step 2 — Generate image via OpenRouter imageModel
  // ------------------------------------------------------------------
  let image_b64: string;
  if (!existing_image_b64 || existing_image_b64.length === 0) {
    if (existing_image_prompt) {
      // Derive only file_name + description from the supplied prompt
      const res = await generateFileNameAndDescription(existing_image_prompt);
      image_prompt = existing_image_prompt;
      file_name = res.file_name;
      image_description = res.description;
    } else {
      const image_prompt_resp = await generateImagePrompt(title, description);
      image_prompt = image_prompt_resp;
      const filename_resp = await generateFileNameAndDescription(image_prompt);
      file_name = filename_resp.file_name;
      image_description = filename_resp.description;
    }

    console.log('[ai_image_assets] image_prompt generated');
    try {
      image_b64 = await generatePuzzleCardImage(image_prompt);
    } catch (err) {
      console.error('[ai_image_assets] image generation failed:', err);
      return { success: false, err_code: 'image_generation_failed' as const };
    }
    console.log('[ai_image_assets] image generated');
  } else {
    image_prompt = existing_image_prompt ?? '';
    file_name = existing_file_name_description?.file_name ?? '';
    image_description = existing_file_name_description?.description ?? '';
    image_b64 = existing_image_b64;
  }

  /*
   - This whole section above will be skipped if the AI related tasks have been already done.
   - This is to prepare for the Batch API usage where we will pregenerate the Image in the queue and then use 
     this function to attach things and upload things.
  */

  // ------------------------------------------------------------------
  // Step 3 — Resize / compress with sharp → WebP
  // ------------------------------------------------------------------
  const raw_buffer = Buffer.from(image_b64, 'base64');
  const compressed_buffer = await resizeImage(raw_buffer, IMAGE_CONFIG.WIDTH, IMAGE_CONFIG.HEIGHT, {
    quality: 82,
    effort: 3
  });

  console.log('[ai_image_assets] image resized/compressed to WebP');

  // ------------------------------------------------------------------
  // Step 4 — Upload to S3
  // ------------------------------------------------------------------
  const s3_key =
    `${PROJECT_S3_ALIAS}/padavali/image_assets/${file_name}_${crypto.randomUUID()}.webp` as const;

  try {
    await uploadAssetFile(s3_key, compressed_buffer);
    console.log('[ai_image_assets] image uploaded to S3:', s3_key);
  } catch (err) {
    console.error('[ai_image_assets] S3 upload failed:', err);
    // Best-effort cleanup (key may not exist yet, but harmless)
    await deleteAssetFile(s3_key).catch(() => {});
    return { success: false, err_code: 'image_upload_failed' as const };
  }

  // ------------------------------------------------------------------
  // Step 5 — Persist image_assets record in DB
  // ------------------------------------------------------------------
  let db_record: typeof image_assets.$inferSelect;
  try {
    [db_record] = await db_instance
      .insert(image_assets)
      .values({
        width: IMAGE_CONFIG.WIDTH,
        height: IMAGE_CONFIG.HEIGHT,
        s3_key,
        description: image_description
      })
      .returning();
  } catch (err) {
    // DB insert failed after upload → clean up the orphaned S3 object
    await deleteAssetFile(s3_key).catch(() => {});
    throw err;
  }

  return {
    success: true,
    time_ms: Date.now() - start_time,
    id: db_record.id,
    s3_key,
    image_prompt,
    description: image_description
  };
};
