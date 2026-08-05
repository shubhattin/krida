import { Effect } from 'effect';
import { z } from 'zod';
import { image_assets } from '~/db/schema';
import { ImageAssetSchemaZod } from '~/db/schema_zod';
import { dbRun, type TxOrDb } from '~/effect/database';
import { PROJECT_S3_ALIAS, KRIDAS } from '~/constants';
import { AiProvider } from '~/effect/ai';
import { ImageProcessor } from '~/effect/image';
import { DatabaseError } from '~/effect/errors';
import { ObjectStorage, type AssetLocation } from '~/effect/storage';
import crypto from 'node:crypto';

/**
 * Final stored dimensions after sharp resize/compress.
 * Keeps exact 3:2 ratio at a web-friendly resolution.
 * Width × Height in pixels → 768 × 512 px.
 */
export const IMAGE_CONFIG = {
  HEIGHT: 512,
  WIDTH: 768,
  ASPECT_RATIO: '3:2',
  IMAGE_GEN_DIMS: '1536x1024'
} as const;

export const OPENROUTER_MODELS = {
  image_prompt: 'openai/gpt-5.4',
  file_name: 'openai/gpt-5.4-nano',
  image_generation: 'openai/gpt-5.4-image-2',
  more_hints: 'openai/gpt-5.6-luna',
  word_meanings: 'openai/gpt-5.6-luna'
} as const;

export const OPENAI_MODELS = {
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

const IMAGE_PROMPT_USER_WORDS = `
Word meanings (use as thematic context; do not render as text in the image):
{words}
`.trim();

const IMAGE_PROMPT_USER_EXTRA = `
Extra instructions for image generation:
{extra_instructions}
`.trim();

export const generate_puzzle_image_input_schema = z.object({
  /** Puzzle title in Sanskrit (shown to the LLM for prompt context) */
  title: z.string().min(1),
  /** Optional short English description of the puzzle for extra context */
  description: z.string().optional(),
  /** Sanskrit words in the puzzle to provide richer context for prompt generation */
  words: z.array(z.string()).optional(),
  /** Extra instructions to the LLM for the image generation */
  extra_instructions: z.string().optional(),
  /** Supply a pre-written image prompt to skip the prompt-generation step */
  existing_image_prompt: z.string().optional(),
  /** Which game the image belongs to — controls the S3 subdirectory. Defaults to padavali for back-compat. */
  game: z.enum(KRIDAS)
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

const image_prompt_response_schema = z.object({
  image_prompt: z
    .string()
    .describe('A detailed English image prompt (≤150 words) for a puzzle card illustration.')
});

const file_name_description_schema = z.object({
  file_name: z
    .string()
    .describe(
      'A short file_name (2–4 words, underscores, lowercase) for the image prompt provided.'
    ),
  description: z
    .string()
    .max(150)
    .describe('A short word description for the image prompt provided.')
});

type FileNameDescription = z.infer<typeof file_name_description_schema>;

type GeneratedImageState = {
  readonly image_prompt: string;
  readonly file_name: string;
  readonly image_description: string;
  readonly image_b64: string;
};

type FailedGeneratePuzzleImageOutput = Extract<GeneratePuzzleImageOutput, { success: false }>;
type GeneratedImageResolution =
  | { readonly ok: true; readonly value: GeneratedImageState }
  | { readonly ok: false; readonly value: FailedGeneratePuzzleImageOutput };

const buildImagePromptUserPrompt = (
  title: string,
  description?: string,
  words?: string[],
  extra_instructions?: string
): string => {
  let user_prompt = IMAGE_PROMPT_USER.replace('{title}', title).replace(
    '{description}',
    description ?? ''
  );

  const trimmed_words = words?.map((w) => w.trim()).filter((w) => w.length > 0);
  if (trimmed_words && trimmed_words.length > 0) {
    user_prompt +=
      '\n\n' +
      IMAGE_PROMPT_USER_WORDS.replace('{words}', trimmed_words.map((w) => `- ${w}`).join('\n'));
  }

  const trimmed_extra = extra_instructions?.trim();
  if (trimmed_extra) {
    user_prompt += '\n\n' + IMAGE_PROMPT_USER_EXTRA.replace('{extra_instructions}', trimmed_extra);
  }

  return user_prompt;
};

const generatePuzzleCardImage = Effect.fn('generatePuzzleCardImage')(function* (
  image_prompt: string
) {
  const ai = yield* AiProvider;
  return yield* ai.generateImageBase64({
    prompt: image_prompt,
    modelId: OPENAI_MODELS.image_generation,
    size: IMAGE_CONFIG.IMAGE_GEN_DIMS,
    quality: 'medium'
  });
});

export const generateImagePrompt = Effect.fn('generateImagePrompt')(function* (
  title: string,
  description?: string,
  words?: string[],
  extra_instructions?: string
) {
  const ai = yield* AiProvider;
  const response = yield* ai.generateObject({
    operation: 'generate_image_prompt',
    provider: 'openrouter',
    model: ai.openrouterModel(OPENROUTER_MODELS.image_prompt),
    system: IMAGE_PROMPT_SYSTEM,
    prompt: buildImagePromptUserPrompt(title, description, words, extra_instructions),
    schema: image_prompt_response_schema
  });
  return response.image_prompt;
});

export const generateFileNameAndDescription = Effect.fn('generateFileNameAndDescription')(
  function* (image_prompt: string) {
    const ai = yield* AiProvider;
    return yield* ai.generateObject({
      operation: 'generate_file_name_and_description',
      provider: 'openrouter',
      model: ai.openrouterModel(OPENROUTER_MODELS.file_name),
      system:
        'Generate a short file_name (2–4 words, underscores, lowercase) and a 4-5 word description for the image prompt provided.',
      prompt: image_prompt,
      schema: file_name_description_schema
    });
  }
);

const sanitizeAssetFileName = (file_name: string): string => {
  const sanitized = file_name
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return sanitized.length > 0 ? sanitized : 'asset';
};

const createAssetLocation = (
  game: GeneratePuzzleImageInput['game'],
  file_name: string,
  suffix: string
): AssetLocation =>
  `${PROJECT_S3_ALIAS}/${game}/image_assets/${sanitizeAssetFileName(file_name)}_${suffix}.webp`;

const insertImageAssetRecord = Effect.fn('insertImageAssetRecord')(function* (
  db_instance: TxOrDb | undefined,
  input: {
    readonly s3_key: AssetLocation;
    readonly description: string;
  }
) {
  const values = {
    width: IMAGE_CONFIG.WIDTH,
    height: IMAGE_CONFIG.HEIGHT,
    s3_key: input.s3_key,
    description: input.description
  };

  const records = db_instance
    ? yield* Effect.tryPromise({
        try: () => db_instance.insert(image_assets).values(values).returning(),
        catch: (cause) => DatabaseError.make({ operation: 'insertImageAssetRecord', cause })
      })
    : yield* dbRun('insertImageAssetRecord', (client) =>
        client.insert(image_assets).values(values).returning()
      );

  const db_record = records[0];
  if (!db_record) {
    return yield* Effect.fail(
      DatabaseError.make({
        operation: 'insertImageAssetRecord',
        cause: new Error('No image asset row returned')
      })
    );
  }

  return ImageAssetSchemaZod.parse(db_record);
});

const resolveGeneratedImageState = Effect.fn('resolveGeneratedImageState')(function* (
  input: GeneratePuzzleImageInput,
  existing_image_b64?: string,
  existing_file_name_description?: FileNameDescription
) {
  const { title, description, words, extra_instructions, existing_image_prompt } = input;

  if (existing_image_b64 && existing_image_b64.length > 0) {
    return {
      image_prompt: existing_image_prompt ?? '',
      file_name: existing_file_name_description?.file_name ?? '',
      image_description: existing_file_name_description?.description ?? '',
      image_b64: existing_image_b64
    } satisfies GeneratedImageState;
  }

  const image_prompt = existing_image_prompt
    ? existing_image_prompt
    : yield* generateImagePrompt(title, description, words, extra_instructions);

  const file_name_description = yield* generateFileNameAndDescription(image_prompt);
  const image_b64 = yield* generatePuzzleCardImage(image_prompt);

  return {
    image_prompt,
    file_name: file_name_description.file_name,
    image_description: file_name_description.description,
    image_b64
  } satisfies GeneratedImageState;
});

/** If image is already provided then this would only upload the image to S3 */
export const generateSavePuzzleImage = Effect.fn('generateSavePuzzleImage')(function* (
  input: GeneratePuzzleImageInput,
  db_instance?: TxOrDb,
  existing_image_b64?: string,
  existing_file_name_description?: FileNameDescription
) {
  const start_time = Date.now();
  const image_processor = yield* ImageProcessor;
  const storage = yield* ObjectStorage;

  const generated_image = yield* resolveGeneratedImageState(
    input,
    existing_image_b64,
    existing_file_name_description
  ).pipe(
    Effect.map((state): GeneratedImageResolution => ({ ok: true, value: state })),
    Effect.catchTag('AiProviderError', () =>
      Effect.succeed<GeneratedImageResolution>({
        ok: false,
        value: {
          success: false,
          err_code: 'image_generation_failed'
        } satisfies FailedGeneratePuzzleImageOutput
      })
    )
  );

  if (!generated_image.ok) {
    return generated_image.value;
  }

  const compressed_result = yield* image_processor
    .resizeImage(
      Buffer.from(generated_image.value.image_b64, 'base64'),
      IMAGE_CONFIG.WIDTH,
      IMAGE_CONFIG.HEIGHT,
      {
        quality: 82,
        effort: 3
      }
    )
    .pipe(
      Effect.map((buffer) => ({ ok: true as const, buffer })),
      Effect.catchTag('ImageProcessingError', () =>
        Effect.succeed({
          ok: false as const,
          value: {
            success: false,
            err_code: 'image_generation_failed'
          } satisfies FailedGeneratePuzzleImageOutput
        })
      )
    );

  if (!compressed_result.ok) {
    return compressed_result.value;
  }

  const s3_key = createAssetLocation(
    input.game,
    generated_image.value.file_name,
    crypto.randomUUID()
  );
  const uploaded = yield* storage.uploadAssetFile(s3_key, compressed_result.buffer).pipe(
    Effect.as(true as const),
    Effect.catchTag('StorageError', (error) =>
      Effect.logWarning('Failed to upload puzzle image to storage').pipe(
        Effect.annotateLogs({
          s3_key,
          operation: error.operation
        }),
        Effect.as(false as const)
      )
    )
  );

  if (!uploaded) {
    return {
      success: false,
      err_code: 'image_upload_failed'
    } satisfies FailedGeneratePuzzleImageOutput;
  }

  const db_record = yield* insertImageAssetRecord(db_instance, {
    s3_key,
    description: generated_image.value.image_description
  }).pipe(
    Effect.catchTag('DatabaseError', (db_error) =>
      storage.deleteAssetFile(s3_key).pipe(
        Effect.catchTag('StorageError', (cleanup_error) =>
          Effect.logWarning('Failed to cleanup uploaded image after DB insert failure').pipe(
            Effect.annotateLogs({
              s3_key,
              dbOperation: db_error.operation,
              cleanupOperation: cleanup_error.operation
            })
          )
        ),
        Effect.flatMap(() => Effect.fail(db_error))
      )
    )
  );

  return {
    success: true,
    time_ms: Date.now() - start_time,
    id: db_record.id,
    s3_key,
    image_prompt: generated_image.value.image_prompt,
    description: generated_image.value.image_description
  } satisfies Extract<GeneratePuzzleImageOutput, { success: true }>;
});
