import { createFileRoute, redirect } from '@tanstack/react-router';

/** In-development games stay off the public /puzzles catalog until release. */
export const Route = createFileRoute('/surupa/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({ to: '/puzzles', statusCode: 301 });
  }
});
