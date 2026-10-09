/** Games that are live on the public hub catalog. */
export const PUBLIC_GAME_KINDS = ['padavali', 'crossword'] as const;
export type PublicGameKind = (typeof PUBLIC_GAME_KINDS)[number];

/** In-development games — admin, collections, tags, and analytics only. */
export const SIMPLE_GAME_KINDS = ['dvayi', 'bhramita', 'surupa', 'anveshi'] as const;
export type SimpleGameKind = (typeof SIMPLE_GAME_KINDS)[number];

const SIMPLE_GAME_KIND_SET: ReadonlySet<string> = new Set(SIMPLE_GAME_KINDS);
const PUBLIC_GAME_KIND_SET: ReadonlySet<string> = new Set(PUBLIC_GAME_KINDS);

export function isSimpleGameKind(game: string): game is SimpleGameKind {
  return SIMPLE_GAME_KIND_SET.has(game);
}

export function isPublicGameKind(game: string): game is PublicGameKind {
  return PUBLIC_GAME_KIND_SET.has(game);
}

export type SimpleGameRoutePrefix = 'dvayi' | 'bhramitA' | 'surUpa' | 'anveshi';

export type SimpleGameMeta = {
  kind: SimpleGameKind;
  /** Public URL prefix (`/bhramitA`, `/surUpa`, …). */
  routePrefix: SimpleGameRoutePrefix;
  name: string;
  nameDev: string;
  subtitle: string;
  description: string;
  /** Tailwind accent tokens for admin + public shells. */
  accent: {
    from: string;
    to: string;
    badge: string;
    glow: string;
    border: string;
    wash: string;
    ring: string;
    cta: string;
  };
};

export const SIMPLE_GAME_META = {
  dvayi: {
    kind: 'dvayi',
    routePrefix: 'dvayi',
    name: 'Dvayī',
    nameDev: 'द्वयी',
    subtitle: 'Match the following',
    description: 'Pair each prompt with its matching counterpart.',
    accent: {
      from: 'from-rose-500',
      to: 'to-orange-500',
      badge:
        'border-rose-300/70 bg-rose-500 text-white dark:border-rose-400/40 dark:bg-rose-500',
      glow: 'bg-rose-500/15 dark:bg-rose-400/10',
      border: 'border-rose-200/70 dark:border-rose-800/50',
      wash: 'from-rose-50/90 via-orange-50/40 to-amber-50/80 dark:from-rose-950/50 dark:via-slate-900/30 dark:to-orange-950/40',
      ring: 'hover:ring-rose-400/55 dark:hover:ring-rose-500/45',
      cta: 'bg-linear-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/20'
    }
  },
  bhramita: {
    kind: 'bhramita',
    routePrefix: 'bhramitA',
    name: 'Bhramitā',
    nameDev: 'भ्रमिता',
    subtitle: 'Jumbled words',
    description: 'Unscramble Devanagari syllables back into the original word.',
    accent: {
      from: 'from-emerald-500',
      to: 'to-teal-600',
      badge:
        'border-emerald-300/70 bg-emerald-600 text-white dark:border-emerald-400/40 dark:bg-emerald-500',
      glow: 'bg-emerald-500/15 dark:bg-emerald-400/10',
      border: 'border-emerald-200/70 dark:border-emerald-800/50',
      wash: 'from-emerald-50/90 via-teal-50/40 to-cyan-50/80 dark:from-emerald-950/50 dark:via-slate-900/30 dark:to-teal-950/40',
      ring: 'hover:ring-emerald-400/55 dark:hover:ring-emerald-500/45',
      cta: 'bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
    }
  },
  surupa: {
    kind: 'surupa',
    routePrefix: 'surUpa',
    name: 'Surūpa',
    nameDev: 'सुरूप',
    subtitle: 'Spelling corrector',
    description: 'Pick the right syllable at each step to restore the word.',
    accent: {
      from: 'from-violet-500',
      to: 'to-fuchsia-600',
      badge:
        'border-violet-300/70 bg-violet-600 text-white dark:border-violet-400/40 dark:bg-violet-500',
      glow: 'bg-violet-500/15 dark:bg-violet-400/10',
      border: 'border-violet-200/70 dark:border-violet-800/50',
      wash: 'from-violet-50/90 via-fuchsia-50/40 to-purple-50/80 dark:from-violet-950/50 dark:via-slate-900/30 dark:to-fuchsia-950/40',
      ring: 'hover:ring-violet-400/55 dark:hover:ring-violet-500/45',
      cta: 'bg-linear-to-r from-violet-500 to-fuchsia-600 text-white shadow-violet-500/20'
    }
  },
  anveshi: {
    kind: 'anveshi',
    routePrefix: 'anveshi',
    name: 'Anveṣī',
    nameDev: 'अन्वेषि',
    subtitle: 'Multiple choice',
    description: 'Answer a set of questions, with optional hints and explanations.',
    accent: {
      from: 'from-sky-500',
      to: 'to-indigo-600',
      badge: 'border-sky-300/70 bg-sky-600 text-white dark:border-sky-400/40 dark:bg-sky-500',
      glow: 'bg-sky-500/15 dark:bg-sky-400/10',
      border: 'border-sky-200/70 dark:border-sky-800/50',
      wash: 'from-sky-50/90 via-indigo-50/40 to-blue-50/80 dark:from-sky-950/50 dark:via-slate-900/30 dark:to-indigo-950/40',
      ring: 'hover:ring-sky-400/55 dark:hover:ring-sky-500/45',
      cta: 'bg-linear-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/20'
    }
  }
} as const satisfies Record<SimpleGameKind, SimpleGameMeta>;

export const SIMPLE_GAME_LIST: SimpleGameMeta[] = SIMPLE_GAME_KINDS.map(
  (kind) => SIMPLE_GAME_META[kind]
);

export function simpleGameHref(kind: SimpleGameKind, slug: string) {
  return `/${SIMPLE_GAME_META[kind].routePrefix}/${encodeURIComponent(slug)}`;
}

export function simpleGameViewHref(kind: SimpleGameKind, uid: string) {
  return `/${SIMPLE_GAME_META[kind].routePrefix}/view/${encodeURIComponent(uid)}`;
}

export function simpleGameEditHref(kind: SimpleGameKind, id: number) {
  return `/${SIMPLE_GAME_META[kind].routePrefix}/edit/${id}`;
}

export function simpleGameListHref(kind: SimpleGameKind) {
  return `/${SIMPLE_GAME_META[kind].routePrefix}/list`;
}

export function simpleGameAnalyticsHref(kind: SimpleGameKind) {
  return `/${SIMPLE_GAME_META[kind].routePrefix}/analytics`;
}
