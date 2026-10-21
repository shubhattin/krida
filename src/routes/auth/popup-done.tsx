import { useEffect } from 'react';
import { z } from 'zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { AUTH_POPUP_CHANNEL } from '~/lib/google_sign_in';
import { Button } from '~/components/ui/button';

/** better-auth appends `error`; our errorCallbackURL adds `status=error`. */
const popup_done_search_schema = z.object({
  status: z.string().optional(),
  error: z.string().optional()
});

export const Route = createFileRoute('/auth/popup-done')({
  validateSearch: popup_done_search_schema,
  head: () => ({
    meta: [{ title: 'Signing in… | Krida' }, { name: 'robots', content: 'noindex' }]
  }),
  component: AuthPopupDone
});

/**
 * OAuth landing page for the sign-in popup: report back to the opener tab
 * over BroadcastChannel and close. Only stays visible if closing is refused.
 */
function AuthPopupDone() {
  const search = Route.useSearch();
  const failed = search.error !== undefined || search.status === 'error';

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(AUTH_POPUP_CHANNEL);
      channel.postMessage({ type: failed ? 'error' : 'signed_in' });
      channel.close();
    } catch {
      // Old browser — the opener refreshes on focus instead.
    }
    const timer = window.setTimeout(() => window.close(), failed ? 1500 : 150);
    return () => window.clearTimeout(timer);
  }, [failed]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        {failed ? (
          <CircleAlert className="size-8 text-destructive" />
        ) : (
          <CheckCircle2 className="size-8 text-emerald-500" />
        )}
        <p className="font-semibold text-foreground">
          {failed ? 'Sign-in did not complete' : 'Signed in'}
        </p>
        <p className="text-sm text-muted-foreground">You can close this window.</p>
        <Button variant="outline" size="sm" render={<Link to="/" />}>
          Back to Krida
        </Button>
      </div>
    </main>
  );
}
