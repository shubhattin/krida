import { z } from 'zod';

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  prefixItems?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
};

/** A zod schema as a one-line TypeScript-ish type, for JSONB columns in the agents' DDL. */
export function zodTypeText(schema: z.ZodType): string {
  // SAFETY: z.toJSONSchema returns a draft-2020-12 JSON Schema; JsonSchema lists the subset we read
  const jsonSchema = z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) as JsonSchema;
  return jsonSchemaToType(jsonSchema);
}

function jsonSchemaToType(node: JsonSchema): string {
  if (node.const !== undefined) return JSON.stringify(node.const);
  if (node.enum) return node.enum.map((value) => JSON.stringify(value)).join(' | ');
  const union = node.anyOf ?? node.oneOf;
  if (union) return union.map(jsonSchemaToType).join(' | ');
  if (node.prefixItems) return `[${node.prefixItems.map(jsonSchemaToType).join(', ')}]`;

  const type = Array.isArray(node.type) ? node.type[0] : node.type;
  switch (type) {
    case 'object': {
      const required = new Set(node.required ?? []);
      const fields = Object.entries(node.properties ?? {}).map(
        ([key, value]) => `${key}${required.has(key) ? '' : '?'}: ${jsonSchemaToType(value)}`
      );
      return `{ ${fields.join('; ')} }`;
    }
    case 'array': {
      if (Array.isArray(node.items)) return `[${node.items.map(jsonSchemaToType).join(', ')}]`;
      const item = node.items ? jsonSchemaToType(node.items) : 'unknown';
      return item.includes(' | ') ? `(${item})[]` : `${item}[]`;
    }
    case 'integer':
      return 'number';
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
      return type;
    default:
      return 'unknown';
  }
}
