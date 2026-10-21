'use client';

import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { Cloud } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { GoogleIcon } from '~/components/icons';
import Icon from '~/tools/Icon';
import { useSession } from '~/lib/auth-client';
import { startGoogleSignIn } from '~/lib/google_sign_in';
import { cn } from '~/lib/utils';

const emptySubscribe = () => () => {};

/**
 * Quiet, always-on sign-in nudge for finished puzzles. Sits under the
 * completion card, never interrupts, so it needs no backoff.
 */
export function GuestSaveProgressCta({ className }: { className?: string }) {
  const { data: session, isPending } = useSession();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  if (!isClient || isPending || session?.user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.35 }}
      className={cn(
        'flex w-full flex-col items-stretch gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 backdrop-blur-sm sm:flex-row sm:items-center dark:border-slate-700/80 dark:bg-slate-900/50',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Cloud className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Keep scores like this</p>
          <p className="text-xs text-muted-foreground">
            Sign in to save finished puzzles and best times to your dashboard.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="shrink-0"
        onClick={() => void startGoogleSignIn('inline')}
      >
        <span data-icon="inline-start">
          <Icon src={GoogleIcon} />
        </span>
        Continue with Google
      </Button>
    </motion.div>
  );
}
