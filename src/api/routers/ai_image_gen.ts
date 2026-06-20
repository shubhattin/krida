import { createOpenRouter, OpenRouterImageSettings } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { t, protectedAdminProcedure } from '../trpc_init';
import { generateText, generateImage, Output } from 'ai';
import { db } from '~/db/db';
import { image_assets } from '~/db/schema';
import { PROJECT_S3_ALIAS } from '~/constants';
import { uploadAssetFile, deleteAssetFile } from '~/util/s3/upload_file.server';
import { resizeImage } from '~/util/sharp/resize.server';
import {
  createOpenAI,
  type OpenAIImageModelGenerationOptions,
  type OpenAIChatLanguageModelOptions
} from '@ai-sdk/openai';

const CURRENT_IMAGE_MODEL_PROVIDER: 'openai' | 'openrouter' = 'openai' as const;
const IMAGE_MODEL_TYPE: 'google' | 'openai' = 'openai' as const;
// ---------------------------------------------------------------------------
// Model & generation constants
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS = {
  image_prompt: 'openai/gpt-5.4' as const,
  file_name: 'openai/gpt-5.4-nano' as const,
  image_generation: 'openai/gpt-5.4-image-2' as const
};

const OPENAI_MODELS = {
  image_generation: 'gpt-image-2' as const
} as const;

const GOOGLE_MODELS = {
  image_generation: 'google/gemini-3-pro-image' as const
} as const;

const REASONING_EFFORT = 'low' as const;

/**
 * Aspect ratio for image generation.
 */
const IMAGE_GENERATION_ASPECT_RATIO = '3:2' as const;

/**
 * Final stored dimensions after sharp resize/compress.
 * Keeps exact 3:2 ratio at a web-friendly resolution.
 * Width × Height in pixels → 768 × 512 px.
 */
const IMAGE_STORED_WIDTH = 768 as const;
const IMAGE_STORED_HEIGHT = 512 as const;

// ---------------------------------------------------------------------------
// OpenRouter provider
// ---------------------------------------------------------------------------

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function getTextModel(type: 'image_prompt' | 'file_name') {
  return openrouter(OPENROUTER_MODELS[type], {
    reasoning: { effort: REASONING_EFFORT }
  });
}
// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

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
- file_name: 2–4 lowercase English words separated by underscores, no extension. E.g. "surya_namaskar_card".
- description: 3–5 English words describing the subject, used for search indexing. E.g. "Sun salutation yoga poses".
`.trim();

const IMAGE_PROMPT_USER = `
Generate an image prompt for the following Sanskrit puzzle:

Title: "{title}"
Description: "{description}"
`.trim();

// **Integrating puzzle words context:**
// - You will be given a list of Sanskrit terms that appear in the puzzle. Use these words to inspire the visual motifs, objects, actions, or secondary subjects in the scene.
// - For example, if the words list contains specific items, deities, cosmic elements, or actions, incorporate those concepts metaphorically or literally into the background, surrounding scenery, or central imagery to match the puzzle's vocabulary theme.

// Words: {words}

const prompt_result_schema = z.object({
  image_prompt: z
    .string()
    .describe('A detailed English image prompt (≤150 words) for a puzzle card illustration.'),
  file_name: z
    .string()
    .describe(
      '2–4 lowercase English words separated by underscores, no extension. E.g. "surya_namaskar_card".'
    ),
  description: z
    .string()
    .trim()
    .max(150)
    .describe(
      'A short description of the image in English in a few words (max 4-5 words, preferrable 3 words). This will be used for searching, so keep it short and concise.'
    )
});

async function generatePuzzleCardImage(image_prompt: string): Promise<string> {
  const image_model =
    IMAGE_MODEL_TYPE === 'google'
      ? openrouter.imageModel(GOOGLE_MODELS.image_generation)
      : CURRENT_IMAGE_MODEL_PROVIDER === 'openai'
        ? openai.image(OPENAI_MODELS.image_generation)
        : openrouter.imageModel(OPENROUTER_MODELS.image_generation, {
            reasoning: { effort: REASONING_EFFORT }
          } as any);

  const result = await generateImage({
    model: image_model,
    prompt: image_prompt,
    aspectRatio: IMAGE_GENERATION_ASPECT_RATIO,
    providerOptions: {
      openai: {
        quality: 'low'
      } satisfies OpenAIImageModelGenerationOptions,
      openrouter: {
        extraBody: {
          quality: 'low'
        },
        reasoning: { effort: REASONING_EFFORT }
      } satisfies OpenRouterImageSettings
    }
  });

  // GeneratedFile.base64 gives the raw base64 string (no data-URL prefix)
  return result.image.base64;
}

const generate_puzzle_card_image_route = protectedAdminProcedure
  .input(
    z.object({
      /** Puzzle title in Sanskrit (shown to the LLM for prompt context) */
      title: z.string().min(1),
      /** Optional short English description of the puzzle for extra context */
      description: z.string().optional().default(''),
      /** Sanskrit words in the puzzle to provide richer context for prompt generation */
      words: z.array(z.string()).optional(),
      /** Supply a pre-written image prompt to skip the prompt-generation step */
      existing_image_prompt: z.string().optional()
    })
  )
  .output(
    z.discriminatedUnion('success', [
      z.object({
        success: z.literal(true),
        time_ms: z.int(),
        id: z.int(),
        s3_key: z.string(),
        image_prompt: z.string()
      }),
      z.object({
        success: z.literal(false),
        err_code: z.enum(['image_upload_failed', 'image_generation_failed'])
      })
    ])
  )
  .mutation(async ({ input }) => {
    const start_time = Date.now();
    const { title, description, existing_image_prompt } = input;

    // ------------------------------------------------------------------
    // Step 1 — Generate image prompt (or use supplied one)
    // ------------------------------------------------------------------
    let image_prompt: string;
    let file_name: string;
    let image_description: string;

    if (existing_image_prompt) {
      // Derive only file_name + description from the supplied prompt
      const response = await generateText({
        model: getTextModel('file_name'),
        output: Output.object({
          schema: prompt_result_schema.pick({ file_name: true, description: true })
        }),
        system:
          'Generate a short file_name (2–4 words, underscores, lowercase) and a 3–5 word description for the image prompt provided.',
        prompt: existing_image_prompt,
        providerOptions: {
          openai: {
            reasoningEffort: 'low'
          } satisfies OpenAIChatLanguageModelOptions
        }
      });
      image_prompt = existing_image_prompt;
      file_name = response.output.file_name;
      image_description = response.output.description;
    } else {
      // const words_list = input.words && input.words.length > 0 ? input.words.join(', ') : 'None';
      const user_prompt = IMAGE_PROMPT_USER.replace('{title}', title).replace(
        '{description}',
        description
      );
      // cuurently ignoring the word context
      // .replace('{words}', words_list);
      const response = await generateText({
        model: getTextModel('image_prompt'),
        output: Output.object({ schema: prompt_result_schema }),
        system: IMAGE_PROMPT_SYSTEM,
        prompt: user_prompt,
        providerOptions: {
          openai: {
            reasoningEffort: REASONING_EFFORT
          } satisfies OpenAIChatLanguageModelOptions
        }
      });
      image_prompt = response.output.image_prompt;
      file_name = response.output.file_name;
      image_description = response.output.description;
    }

    console.log('[ai_image_assets] image_prompt generated:');

    // ------------------------------------------------------------------
    // Step 2 — Generate image via OpenRouter imageModel
    // ------------------------------------------------------------------
    let image_b64: string;
    try {
      image_b64 = await generatePuzzleCardImage(image_prompt);
    } catch (err) {
      console.error('[ai_image_assets] image generation failed:', err);
      return { success: false, err_code: 'image_generation_failed' as const };
    }

    console.log('[ai_image_assets] image generated');

    // ------------------------------------------------------------------
    // Step 3 — Resize / compress with sharp → WebP
    // ------------------------------------------------------------------
    const raw_buffer = Buffer.from(image_b64, 'base64');
    const compressed_buffer = await resizeImage(
      raw_buffer,
      IMAGE_STORED_WIDTH,
      IMAGE_STORED_HEIGHT,
      {
        quality: 82,
        effort: 3
      }
    );

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
      [db_record] = await db
        .insert(image_assets)
        .values({
          width: IMAGE_STORED_WIDTH,
          height: IMAGE_STORED_HEIGHT,
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
  });

export const ai_image_assets_router = t.router({
  generate_puzzle_card_image: generate_puzzle_card_image_route
});
