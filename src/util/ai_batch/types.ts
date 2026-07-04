import { z } from 'zod';

export const ai_batch_completion_window_schema = z.literal('24h');
export type AiBatchCompletionWindow = z.infer<typeof ai_batch_completion_window_schema>;

export const ai_batch_endpoint_schema = z.enum(['/v1/images/generations', '/v1/responses']);
export type AiBatchEndpoint = z.infer<typeof ai_batch_endpoint_schema>;

export const ai_batch_gpt_image_1_quality_schema = z.enum(['low', 'medium', 'high', 'auto']);
export type AiBatchGptImage1Quality = z.infer<typeof ai_batch_gpt_image_1_quality_schema>;

export const ai_batch_gpt_image_1_size_schema = z.enum([
  '1024x1024',
  '1024x1536',
  '1536x1024',
  'auto'
]);
export type AiBatchGptImage1Size = z.infer<typeof ai_batch_gpt_image_1_size_schema>;

export const ai_batch_gpt_image_1_background_schema = z.enum(['transparent', 'opaque', 'auto']);
export type AiBatchGptImage1Background = z.infer<typeof ai_batch_gpt_image_1_background_schema>;

export const ai_batch_gpt_image_1_output_format_schema = z.enum(['png', 'jpeg', 'webp']);
export type AiBatchGptImage1OutputFormat = z.infer<
  typeof ai_batch_gpt_image_1_output_format_schema
>;

export const ai_batch_gpt_image_2_quality_schema = z.enum(['low', 'medium', 'high', 'auto']);
export type AiBatchGptImage2Quality = z.infer<typeof ai_batch_gpt_image_2_quality_schema>;

export const ai_batch_gpt_image_2_size_schema = z.enum([
  '1024x1024',
  '1536x1024',
  '1024x1536',
  'auto'
]);
export type AiBatchGptImage2Size = z.infer<typeof ai_batch_gpt_image_2_size_schema>;

export const ai_batch_gpt_image_2_background_schema = z.enum(['opaque', 'auto']);
export type AiBatchGptImage2Background = z.infer<typeof ai_batch_gpt_image_2_background_schema>;

export const ai_batch_gpt_image_2_output_format_schema = z.enum(['png', 'jpeg', 'webp']);
export type AiBatchGptImage2OutputFormat = z.infer<
  typeof ai_batch_gpt_image_2_output_format_schema
>;

/** @deprecated Use model-specific quality schemas instead. */
export const ai_batch_image_quality_schema = ai_batch_gpt_image_2_quality_schema;
export type AiBatchImageQuality = AiBatchGptImage2Quality;

/** @deprecated Use model-specific size schemas instead. */
export const ai_batch_image_size_schema = ai_batch_gpt_image_2_size_schema;
export type AiBatchImageSize = AiBatchGptImage2Size;

export const ai_batch_response_input_text_schema = z.object({
  type: z.literal('input_text'),
  text: z.string()
});
export type AiBatchResponseInputText = z.infer<typeof ai_batch_response_input_text_schema>;

export const ai_batch_response_input_image_schema = z
  .object({
    type: z.literal('input_image'),
    detail: z.enum(['low', 'high', 'auto', 'original']).default('auto'),
    file_id: z.string().optional(),
    image_url: z.string().optional()
  })
  .refine((value) => value.file_id || value.image_url, {
    message: 'input_image requires either file_id or image_url'
  });
export type AiBatchResponseInputImage = z.input<typeof ai_batch_response_input_image_schema>;

export const ai_batch_response_input_file_schema = z
  .object({
    type: z.literal('input_file'),
    detail: z.enum(['low', 'high']).default('low'),
    file_data: z.string().optional(),
    file_id: z.string().optional(),
    file_url: z.string().optional(),
    filename: z.string().optional()
  })
  .refine((value) => value.file_data || value.file_id || value.file_url, {
    message: 'input_file requires one of file_data, file_id, or file_url'
  });
export type AiBatchResponseInputFile = z.input<typeof ai_batch_response_input_file_schema>;

export const ai_batch_response_input_content_schema = z.discriminatedUnion('type', [
  ai_batch_response_input_text_schema,
  ai_batch_response_input_image_schema,
  ai_batch_response_input_file_schema
]);
export type AiBatchResponseInputContent = z.input<typeof ai_batch_response_input_content_schema>;

export const ai_batch_response_input_message_schema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'developer']),
  content: z.union([z.string(), z.array(ai_batch_response_input_content_schema)]),
  type: z.literal('message').optional(),
  phase: z.enum(['commentary', 'final_answer']).optional()
});
export type AiBatchResponseInputMessage = z.infer<typeof ai_batch_response_input_message_schema>;

export const ai_batch_response_input_schema = z.union([
  z.string(),
  z.array(ai_batch_response_input_message_schema)
]);
export type AiBatchResponseInput = z.infer<typeof ai_batch_response_input_schema>;

export const ai_batch_extra_body_schema = z.record(z.string(), z.unknown());
export type AiBatchExtraBody = z.infer<typeof ai_batch_extra_body_schema>;

export const ai_batch_zod_object_schema = z.custom<z.ZodObject>(
  (value) => value instanceof z.ZodObject,
  'Expected a Zod object schema'
);
export type AiBatchZodObjectSchema = z.infer<typeof ai_batch_zod_object_schema>;

export const ai_batch_json_schema_format_schema = z.object({
  type: z.literal('json_schema'),
  name: z.string().min(1),
  schema: z.record(z.string(), z.unknown()),
  strict: z.boolean()
});
export type AiBatchJsonSchemaFormat = z.infer<typeof ai_batch_json_schema_format_schema>;

export const ai_batch_response_format_schema = z.object({
  format: ai_batch_json_schema_format_schema
});
export type AiBatchResponseFormat = z.infer<typeof ai_batch_response_format_schema>;

export const ai_batch_reasoning_effort_schema = z.enum([
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh'
]);
export type AiBatchReasoningEffort = z.infer<typeof ai_batch_reasoning_effort_schema>;

export const ai_batch_reasoning_schema = z.object({
  effort: ai_batch_reasoning_effort_schema.default('low')
});
export type AiBatchReasoning = z.input<typeof ai_batch_reasoning_schema>;

export const ai_batch_gpt_image_1_input_schema = z
  .object({
    type: z.literal('image'),
    custom_id: z.string().min(1),
    prompt: z.string().min(1),
    model: z.literal('gpt-image-1'),
    quality: ai_batch_gpt_image_1_quality_schema.default('medium'),
    size: ai_batch_gpt_image_1_size_schema.default('auto'),
    background: ai_batch_gpt_image_1_background_schema.optional(),
    output_format: ai_batch_gpt_image_1_output_format_schema.optional(),
    output_compression: z.number().int().min(0).max(100).optional(),
    body: ai_batch_extra_body_schema.optional()
  })
  .refine(
    (value) =>
      value.output_compression === undefined ||
      value.output_format === 'jpeg' ||
      value.output_format === 'webp',
    {
      message: 'output_compression is only supported with output_format jpeg or webp'
    }
  );
export type AiBatchGptImage1Input = z.input<typeof ai_batch_gpt_image_1_input_schema>;

export const ai_batch_gpt_image_2_input_schema = z
  .object({
    type: z.literal('image'),
    custom_id: z.string().min(1),
    prompt: z.string().min(1),
    model: z.literal('gpt-image-2').default('gpt-image-2'),
    quality: ai_batch_gpt_image_2_quality_schema.default('medium'),
    size: ai_batch_gpt_image_2_size_schema.default('1536x1024'),
    background: ai_batch_gpt_image_2_background_schema.optional(),
    output_format: ai_batch_gpt_image_2_output_format_schema.optional(),
    output_compression: z.number().int().min(0).max(100).optional(),
    body: ai_batch_extra_body_schema.optional()
  })
  .refine(
    (value) =>
      value.output_compression === undefined ||
      value.output_format === 'jpeg' ||
      value.output_format === 'webp',
    {
      message: 'output_compression is only supported with output_format jpeg or webp'
    }
  );
export type AiBatchGptImage2Input = z.input<typeof ai_batch_gpt_image_2_input_schema>;

export const ai_batch_image_input_schema = z.discriminatedUnion('model', [
  ai_batch_gpt_image_1_input_schema,
  ai_batch_gpt_image_2_input_schema
]);
export type AiBatchImageInput = z.input<typeof ai_batch_image_input_schema>;

export const ai_batch_text_input_schema = z.object({
  type: z.literal('text'),
  custom_id: z.string().min(1),
  model: z.string().min(1),
  input: ai_batch_response_input_schema,
  instructions: z.string().optional(),
  reasoning: ai_batch_reasoning_schema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_output_tokens: z.number().int().positive().optional(),
  body: ai_batch_extra_body_schema.optional()
});
export type AiBatchTextInput = z.input<typeof ai_batch_text_input_schema>;

export const ai_batch_object_input_schema = z.object({
  type: z.literal('object'),
  custom_id: z.string().min(1),
  model: z.string().min(1),
  input: ai_batch_response_input_schema,
  output_schema: ai_batch_zod_object_schema,
  output_schema_name: z.string().min(1).default('batch_object'),
  instructions: z.string().optional(),
  reasoning: ai_batch_reasoning_schema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_output_tokens: z.number().int().positive().optional(),
  body: ai_batch_extra_body_schema.optional()
});
export type AiBatchObjectInput = z.input<typeof ai_batch_object_input_schema>;

export const ai_batch_input_schema = z.discriminatedUnion('type', [
  ai_batch_image_input_schema,
  ai_batch_text_input_schema,
  ai_batch_object_input_schema
]);
export type AiBatchInput = z.input<typeof ai_batch_input_schema>;

export const ai_batch_inputs_schema = z.array(ai_batch_input_schema).min(1);
export type AiBatchInputs = z.input<typeof ai_batch_inputs_schema>;

export const ai_batch_output_expectation_schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    custom_id: z.string().min(1)
  }),
  z.object({
    type: z.literal('text'),
    custom_id: z.string().min(1)
  }),
  z.object({
    type: z.literal('object'),
    custom_id: z.string().min(1),
    output_schema: ai_batch_zod_object_schema
  })
]);
export type AiBatchOutputExpectation = z.infer<typeof ai_batch_output_expectation_schema>;

export const ai_batch_output_expectations_schema = z.array(ai_batch_output_expectation_schema);
export type AiBatchOutputExpectations = z.infer<typeof ai_batch_output_expectations_schema>;

const ai_batch_image_line_body_schema = z.discriminatedUnion('model', [
  z
    .object({
      model: z.literal('gpt-image-1'),
      prompt: z.string().min(1),
      quality: ai_batch_gpt_image_1_quality_schema,
      size: ai_batch_gpt_image_1_size_schema
    })
    .passthrough(),
  z
    .object({
      model: z.literal('gpt-image-2'),
      prompt: z.string().min(1),
      quality: ai_batch_gpt_image_2_quality_schema,
      size: ai_batch_gpt_image_2_size_schema
    })
    .passthrough()
]);

export const ai_batch_line_schema = z.discriminatedUnion('url', [
  z.object({
    custom_id: z.string().min(1),
    method: z.literal('POST'),
    url: z.literal('/v1/images/generations'),
    body: ai_batch_image_line_body_schema
  }),
  z.object({
    custom_id: z.string().min(1),
    method: z.literal('POST'),
    url: z.literal('/v1/responses'),
    body: z
      .object({
        model: z.string().min(1),
        input: ai_batch_response_input_schema
      })
      .passthrough()
  })
]);
export type AiBatchLine = z.infer<typeof ai_batch_line_schema>;

export const ai_batch_api_error_schema = z
  .object({
    code: z.string().nullable().optional(),
    message: z.string(),
    param: z.string().nullable().optional(),
    type: z.string().optional()
  })
  .passthrough();
export type AiBatchApiError = z.infer<typeof ai_batch_api_error_schema>;

export const ai_batch_raw_output_line_schema = z.object({
  id: z.string(),
  custom_id: z.string(),
  response: z
    .object({
      status_code: z.number(),
      request_id: z.string(),
      body: z.unknown()
    })
    .nullable(),
  error: ai_batch_api_error_schema.nullable().optional()
});
export type AiBatchRawOutputLine = z.infer<typeof ai_batch_raw_output_line_schema>;

export const ai_batch_image_body_schema = z
  .object({
    created: z.number(),
    background: z.string().optional(),
    output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
    quality: z.union([ai_batch_gpt_image_1_quality_schema, ai_batch_gpt_image_2_quality_schema]),
    size: z.string(),
    data: z.array(
      z.strictObject({
        b64_json: z.string()
      })
    )
  })
  .loose();
export type AiBatchImageBody = z.infer<typeof ai_batch_image_body_schema>;

const ai_batch_output_base_schema = z.object({
  id: z.string(),
  custom_id: z.string(),
  status_code: z.number().optional(),
  request_id: z.string().optional(),
  error: ai_batch_api_error_schema.nullable().optional()
});

export const ai_batch_image_output_schema = ai_batch_output_base_schema.extend({
  type: z.literal('image'),
  success: z.boolean(),
  body: ai_batch_image_body_schema.optional(),
  image_b64: z.string().optional()
});
export type AiBatchImageOutput = z.infer<typeof ai_batch_image_output_schema>;

export const ai_batch_text_output_schema = ai_batch_output_base_schema.extend({
  type: z.literal('text'),
  success: z.boolean(),
  text: z.string().optional(),
  body: z.unknown().optional()
});
export type AiBatchTextOutput = z.infer<typeof ai_batch_text_output_schema>;

export const ai_batch_object_output_schema = ai_batch_output_base_schema.extend({
  type: z.literal('object'),
  success: z.boolean(),
  data: z.unknown().optional(),
  text: z.string().optional(),
  body: z.unknown().optional()
});
export type AiBatchObjectOutput = z.infer<typeof ai_batch_object_output_schema>;

export const ai_batch_output_schema = z.discriminatedUnion('type', [
  ai_batch_image_output_schema,
  ai_batch_text_output_schema,
  ai_batch_object_output_schema
]);
export type AiBatchOutput = z.infer<typeof ai_batch_output_schema>;

export const ai_batch_polling_status_schema = z.enum([
  'validating',
  'failed',
  'in_progress',
  'finalizing',
  'expired',
  'cancelling',
  'cancelled'
]);
export type AiBatchPollingStatus = z.infer<typeof ai_batch_polling_status_schema>;

export const ai_batch_pending_result_schema = z.object({
  status: ai_batch_polling_status_schema,
  batch_id: z.string(),
  input_file_id: z.string(),
  output_file_id: z.string().optional(),
  error_file_id: z.string().optional()
});
export type AiBatchPendingResult = z.infer<typeof ai_batch_pending_result_schema>;

export const ai_batch_completed_result_schema = z.object({
  status: z.literal('completed'),
  batch_id: z.string(),
  input_file_id: z.string(),
  output_file_id: z.string().optional(),
  error_file_id: z.string().optional(),
  responses: z.array(ai_batch_output_schema),
  errors: z.array(ai_batch_output_schema).default([])
});
export type AiBatchCompletedResult = z.infer<typeof ai_batch_completed_result_schema>;

export const ai_batch_result_schema = z.discriminatedUnion('status', [
  ai_batch_pending_result_schema,
  ai_batch_completed_result_schema
]);
export type AiBatchResult = z.infer<typeof ai_batch_result_schema>;

export const ai_batch_created_schema = z.object({
  batch_id: z.string(),
  input_file_id: z.string()
});
export type AiBatchCreated = z.infer<typeof ai_batch_created_schema>;
