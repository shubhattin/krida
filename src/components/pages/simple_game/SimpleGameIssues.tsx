'use client';

import { AlertTriangleIcon, BanIcon, CheckCircle2Icon } from 'lucide-react';
import type { GameAnalysis } from '~/util/games/issues';
import { cn } from '~/lib/utils';

export function SimpleGameIssues({ analysis }: { analysis: GameAnalysis }) {
  return (
    <div className="space-y-3">
      {analysis.errors.length > 0 ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-3 dark:border-red-900/60 dark:bg-red-950/40">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-red-800 dark:text-red-200">
            <BanIcon className="size-4" />
            Errors — saving is blocked
          </p>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
            {analysis.errors.map((issue) => (
              <li key={`${issue.code}:${issue.path ?? ''}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangleIcon className="size-4" />
            Warnings
          </p>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {analysis.warnings.map((issue) => (
              <li key={`${issue.code}:${issue.path ?? ''}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.canSave && analysis.canList ? (
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300'
          )}
        >
          <CheckCircle2Icon className="size-4" />
          Ready to list
        </p>
      ) : null}
    </div>
  );
}
