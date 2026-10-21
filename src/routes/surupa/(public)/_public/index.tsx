import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/surupa` → hub home puzzles section (`/?game=surupa#surupa`). */
export const Route = createFileRoute('/surupa/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'surupa' }, hash: 'surupa', statusCode: 301 });
  }
});
