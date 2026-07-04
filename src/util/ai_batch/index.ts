import type OpenAI from 'openai';
import { toFile } from 'openai';
import { z } from 'zod';
import {
  ai_batch_api_error_schema,
  ai_batch_completed_result_schema,
  ai_batch_image_body_schema,
  ai_batch_input_schema,
  ai_batch_inputs_schema,
  ai_batch_response_format_schema,
  ai_batch_line_schema,
  ai_batch_output_expectations_schema,
  ai_batch_polling_status_schema,
  ai_batch_raw_output_line_schema,
  ai_batch_created_schema,
  type AiBatchEndpoint,
  type AiBatchInput,
  type AiBatchLine,
  type AiBatchObjectOutput,
  type AiBatchOutput,
  type AiBatchOutputExpectation,
  type AiBatchResult
} from './types';

export type { AiBatchInput, AiBatchOutput, AiBatchCreated } from './types';

type OpenAIBatchClient = Pick<OpenAI, 'batches' | 'files'>;

export type GetAiBatchResultOptions = {
  /**
   * Optional original inputs. Useful for object responses, because the Batch
   * output file only includes custom_id and does not repeat local schemas.
   */
  inputs?: AiBatchInput[];
  /**
   * Lightweight polling expectations for callers that do not want to keep the
   * original request bodies around. Object responses still need their Zod schema.
   */
  outputs?: AiBatchOutputExpectation[];
};

function toOutputExpectation(input: AiBatchInput): AiBatchOutputExpectation {
  if (input.type === 'object') {
    return {
      type: input.type,
      custom_id: input.custom_id,
      output_schema: input.output_schema
    };
  }

  return {
    type: input.type,
    custom_id: input.custom_id
  };
}

function getInputEndpoint(input: AiBatchInput): AiBatchEndpoint {
  return input.type === 'image' ? '/v1/images/generations' : '/v1/responses';
}

function assertUniqueCustomIds(inputs: AiBatchInput[]) {
  const custom_ids = new Set<string>();

  for (const input of inputs) {
    if (custom_ids.has(input.custom_id)) {
      throw new Error(`Duplicate batch custom_id: ${input.custom_id}`);
    }

    custom_ids.add(input.custom_id);
  }
}

function getSingleEndpoint(inputs: AiBatchInput[]): AiBatchEndpoint {
  const endpoints = new Set(inputs.map(getInputEndpoint));

  if (endpoints.size !== 1) {
    throw new Error('A single OpenAI batch can only target one endpoint.');
  }

  const [endpoint] = endpoints;
  if (!endpoint) {
    throw new Error('Cannot create an empty OpenAI batch.');
  }

  return endpoint;
}

function assertSingleModel(inputs: AiBatchInput[]) {
  const models = new Set(ai_batch_inputs_schema.parse(inputs).map((input) => input.model));

  if (models.size !== 1) {
    throw new Error('A single OpenAI batch can only target one model.');
  }
}

export function toAiBatchLine(input: AiBatchInput): AiBatchLine {
  const parsed = ai_batch_input_schema.parse(input);

  if (parsed.type === 'image') {
    const body = {
      ...parsed.body,
      model: parsed.model,
      prompt: parsed.prompt,
      quality: parsed.quality,
      size: parsed.size,
      ...(parsed.background !== undefined ? { background: parsed.background } : {}),
      ...(parsed.output_format !== undefined ? { output_format: parsed.output_format } : {}),
      ...(parsed.output_compression !== undefined
        ? { output_compression: parsed.output_compression }
        : {})
    };

    return ai_batch_line_schema.parse({
      custom_id: parsed.custom_id,
      method: 'POST',
      url: '/v1/images/generations',
      body
    });
  }

  const base_body = {
    ...parsed.body,
    model: parsed.model,
    input: parsed.input,
    instructions: parsed.instructions,
    reasoning: parsed.reasoning,
    temperature: parsed.temperature,
    max_output_tokens: parsed.max_output_tokens
  };

  if (parsed.type === 'text') {
    return ai_batch_line_schema.parse({
      custom_id: parsed.custom_id,
      method: 'POST',
      url: '/v1/responses',
      body: base_body
    });
  }

  const text = ai_batch_response_format_schema.parse({
    format: {
      type: 'json_schema',
      name: parsed.output_schema_name,
      schema: z.toJSONSchema(parsed.output_schema),
      strict: true
    }
  });

  return ai_batch_line_schema.parse({
    custom_id: parsed.custom_id,
    method: 'POST',
    url: '/v1/responses',
    body: {
      ...base_body,
      text
    }
  });
}

export function toAiBatchJsonl(inputs: AiBatchInput[]): string {
  const parsed = ai_batch_inputs_schema.parse(inputs);
  assertUniqueCustomIds(parsed);
  getSingleEndpoint(parsed);
  assertSingleModel(parsed);

  return parsed.map((input) => JSON.stringify(toAiBatchLine(input))).join('\n');
}

export async function createAiBatch(openai: OpenAIBatchClient, inputs: AiBatchInput[]) {
  const parsed = ai_batch_inputs_schema.parse(inputs);
  assertUniqueCustomIds(parsed);
  const endpoint = getSingleEndpoint(parsed);
  assertSingleModel(parsed);
  const requests_jsonl = parsed.map((input) => JSON.stringify(toAiBatchLine(input))).join('\n');

  const file = await openai.files.create({
    file: await toFile(Buffer.from(requests_jsonl), 'batch-input.jsonl', {
      type: 'application/jsonl'
    }),
    purpose: 'batch'
  });

  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint,
    completion_window: '24h'
  });

  return ai_batch_created_schema.parse({
    batch_id: batch.id,
    input_file_id: file.id
  });
}

function createExpectationMap(options?: GetAiBatchResultOptions) {
  const expectations = [
    ...(options?.inputs?.map((input) => toOutputExpectation(ai_batch_input_schema.parse(input))) ??
      []),
    ...(options?.outputs ? ai_batch_output_expectations_schema.parse(options.outputs) : [])
  ];

  return new Map(expectations.map((expectation) => [expectation.custom_id, expectation]));
}

const response_text_body_schema = z
  .object({
    output_text: z.string().optional(),
    output: z
      .array(
        z
          .object({
            content: z
              .array(
                z
                  .object({
                    type: z.string().optional(),
                    text: z.string().optional()
                  })
                  .loose()
              )
              .optional()
          })
          .loose()
      )
      .optional()
  })
  .loose();

function extractResponseText(body: unknown) {
  const parsed = response_text_body_schema.parse(body);

  if (parsed.output_text) {
    return parsed.output_text;
  }

  const text_chunks: string[] = [];

  for (const output of parsed.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string') {
        text_chunks.push(content.text);
      }
    }
  }

  return text_chunks.join('');
}

function inferSuccessfulOutputType(body: unknown): AiBatchOutputExpectation['type'] {
  const image_body = ai_batch_image_body_schema.safeParse(body);
  return image_body.success &&
    Array.isArray(image_body.data.data) &&
    image_body.data.data.length > 0
    ? 'image'
    : 'text';
}

function getExpectedType(
  raw: z.infer<typeof ai_batch_raw_output_line_schema>,
  expectation: AiBatchOutputExpectation | undefined
): AiBatchOutputExpectation['type'] {
  if (expectation) {
    return expectation.type;
  }

  if (raw.response) {
    return inferSuccessfulOutputType(raw.response.body);
  }

  throw new Error(
    `Cannot determine response type for failed batch output ${raw.custom_id}. Pass an output expectation when polling.`
  );
}

function parseObjectText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Object batch response did not contain valid JSON text.');
  }
}

const response_error_body_schema = z.object({
  error: ai_batch_api_error_schema
});

function getResponseError(body: unknown) {
  return response_error_body_schema.safeParse(body).data?.error;
}

function parseOutputLine(
  value: unknown,
  expectation: AiBatchOutputExpectation | undefined
): AiBatchOutput {
  const raw = ai_batch_raw_output_line_schema.parse(value);
  const type = getExpectedType(raw, expectation);
  const base = {
    id: raw.id,
    custom_id: raw.custom_id,
    status_code: raw.response?.status_code,
    request_id: raw.response?.request_id,
    error: raw.error ?? null
  };

  if (!raw.response) {
    return {
      ...base,
      type,
      success: false
    } as AiBatchOutput;
  }

  if (raw.response.status_code >= 400) {
    return {
      ...base,
      type,
      success: false,
      error: getResponseError(raw.response.body) ?? base.error
    } as AiBatchOutput;
  }

  if (type === 'image') {
    const body = ai_batch_image_body_schema.parse(raw.response.body);

    return {
      ...base,
      type: 'image',
      success: true,
      body,
      image_b64: body.data[0]?.b64_json
    };
  }

  const text = extractResponseText(raw.response.body);

  if (type === 'text') {
    return {
      ...base,
      type: 'text',
      success: true,
      text,
      body: raw.response.body
    };
  }

  const object_expectation = expectation?.type === 'object' ? expectation : undefined;

  if (!object_expectation) {
    throw new Error(
      `Object batch output ${raw.custom_id} requires its Zod output schema when polling.`
    );
  }

  const data = object_expectation.output_schema.parse(parseObjectText(text));

  return {
    ...base,
    type: 'object',
    success: true,
    data,
    text,
    body: raw.response.body
  } satisfies AiBatchObjectOutput;
}

function parseOutputFile(text: string, expectations: Map<string, AiBatchOutputExpectation>) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const raw_json = JSON.parse(line);
      const custom_id = z.object({ custom_id: z.string() }).parse(raw_json).custom_id;
      return parseOutputLine(raw_json, expectations.get(custom_id));
    });
}

function formatBatchErrorFileMessage(batch_id: string, text: string) {
  const lines = text
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 5)
    .join('\n');

  return `Completed batch ${batch_id} only has an error_file_id. First error lines:\n${lines}`;
}

function toBatchFileIds(batch: {
  input_file_id: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
}) {
  return {
    input_file_id: batch.input_file_id,
    output_file_id: batch.output_file_id ?? undefined,
    error_file_id: batch.error_file_id ?? undefined
  };
}

export async function getAiBatchResult(
  openai: OpenAIBatchClient,
  batch_id: string,
  options?: GetAiBatchResultOptions
): Promise<AiBatchResult> {
  const batch = await openai.batches.retrieve(batch_id);

  if (batch.status !== 'completed') {
    return {
      status: ai_batch_polling_status_schema.parse(batch.status),
      batch_id: batch.id,
      ...toBatchFileIds(batch)
    };
  }

  const expectations = createExpectationMap(options);
  const responses = batch.output_file_id
    ? parseOutputFile(await (await openai.files.content(batch.output_file_id)).text(), expectations)
    : [];

  const error_text = batch.error_file_id
    ? await (await openai.files.content(batch.error_file_id)).text()
    : '';

  if (error_text && expectations.size === 0) {
    throw new Error(formatBatchErrorFileMessage(batch.id, error_text));
  }

  const errors = error_text ? parseOutputFile(error_text, expectations) : [];

  if (!batch.output_file_id && !batch.error_file_id) {
    throw new Error(`Completed batch ${batch.id} does not have output_file_id or error_file_id.`);
  }

  return ai_batch_completed_result_schema.parse({
    status: 'completed',
    batch_id: batch.id,
    ...toBatchFileIds(batch),
    responses,
    errors
  });
}
