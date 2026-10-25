import { z } from 'zod';
import type { GameKind } from '~/util/catalog/tags';
import { PADAVALI_MAX_DIM, PADAVALI_MIN_DIM } from '~/util/puzzle/slug';

/**
 * Starting options for a Puzzle Creator chat. They only set defaults: the system prompt tells
 * the agent to follow them unless the admin asks for something else in the conversation.
 */
export const creator_options_schema = z.object({
  /** Words / entries / pairs / questions per puzzle. */
  item_count: z.number().int().min(2).max(40),
  /** Padāvalī grid. */
  grid_rows: z.number().int().min(PADAVALI_MIN_DIM).max(PADAVALI_MAX_DIM).optional(),
  grid_cols: z.number().int().min(PADAVALI_MIN_DIM).max(PADAVALI_MAX_DIM).optional(),
  /** Anveṣī options per question; Surūpa misspellings per akṣara. */
  choices: z.number().int().min(1).max(6).optional(),
  /** Anveṣī: write the answer options in Sanskrit Devanagari. */
  options_devanagari: z.boolean().optional()
});

export type CreatorOptions = z.infer<typeof creator_options_schema>;

export type CreatorOptionKey = keyof CreatorOptions;

type StepperOptionField = {
  kind: 'stepper';
  key: 'item_count' | 'grid_rows' | 'grid_cols' | 'choices';
  label: string;
  min: number;
  max: number;
};

type CheckboxOptionField = {
  kind: 'checkbox';
  key: 'options_devanagari';
  label: string;
};

type OptionField = StepperOptionField | CheckboxOptionField;

/** Fields each game offers, with defaults taken from the existing puzzles. */
export const CREATOR_OPTION_FIELDS = {
  padavali: {
    defaults: { item_count: 9, grid_rows: 6, grid_cols: 6 },
    fields: [
      { kind: 'stepper', key: 'item_count', label: 'Words', min: 3, max: 25 },
      {
        kind: 'stepper',
        key: 'grid_rows',
        label: 'Grid rows',
        min: PADAVALI_MIN_DIM,
        max: PADAVALI_MAX_DIM
      },
      {
        kind: 'stepper',
        key: 'grid_cols',
        label: 'Grid columns',
        min: PADAVALI_MIN_DIM,
        max: PADAVALI_MAX_DIM
      }
    ]
  },
  padajala: {
    // Words only: the admin picks which ones go into the grid in the editor anyway.
    defaults: { item_count: 12 },
    fields: [{ kind: 'stepper', key: 'item_count', label: 'Words', min: 4, max: 30 }]
  },
  dvayi: {
    defaults: { item_count: 5 },
    fields: [{ kind: 'stepper', key: 'item_count', label: 'Pairs', min: 2, max: 12 }]
  },
  bhramita: {
    defaults: { item_count: 6 },
    fields: [{ kind: 'stepper', key: 'item_count', label: 'Words', min: 2, max: 15 }]
  },
  surupa: {
    defaults: { item_count: 6, choices: 2 },
    fields: [
      { kind: 'stepper', key: 'item_count', label: 'Words', min: 2, max: 15 },
      { kind: 'stepper', key: 'choices', label: 'Misspellings per akṣara', min: 1, max: 4 }
    ]
  },
  anveshi: {
    defaults: { item_count: 6, choices: 4, options_devanagari: true },
    fields: [
      { kind: 'stepper', key: 'item_count', label: 'Questions', min: 2, max: 20 },
      { kind: 'stepper', key: 'choices', label: 'Options per question', min: 2, max: 6 },
      { kind: 'checkbox', key: 'options_devanagari', label: 'Options in Devanagari' }
    ]
  }
} as const satisfies Record<GameKind, { defaults: CreatorOptions; fields: readonly OptionField[] }>;

/** Keep only the fields this game uses, clamped to their ranges; missing ones get defaults. */
export function resolveCreatorOptions(
  kind: GameKind,
  input: Partial<CreatorOptions> | null | undefined
): CreatorOptions {
  const { defaults, fields } = CREATOR_OPTION_FIELDS[kind];
  const resolved: CreatorOptions = { ...defaults };
  for (const field of fields) {
    if (field.kind === 'checkbox') {
      const value = input?.[field.key];
      if (value === true || value === false) resolved[field.key] = value;
      continue;
    }
    const value = input?.[field.key] ?? resolved[field.key];
    if (value !== undefined) {
      resolved[field.key] = Math.min(field.max, Math.max(field.min, Math.round(value)));
    }
  }
  return resolved;
}

/** One line per option, for the system prompt and the chat header. */
export function describeCreatorOptions(kind: GameKind, options: CreatorOptions): string[] {
  const lines: string[] = [];
  for (const field of CREATOR_OPTION_FIELDS[kind].fields) {
    if (field.kind === 'checkbox') {
      lines.push(`${field.label}: ${options[field.key] ? 'yes' : 'no'}`);
    } else if (field.key !== 'grid_rows' && field.key !== 'grid_cols') {
      lines.push(`${field.label}: ${options[field.key]}`);
    }
  }
  if (options.grid_rows && options.grid_cols) {
    lines.push(`Grid: ${options.grid_rows}×${options.grid_cols}`);
  }
  return lines;
}
