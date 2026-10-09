import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padajala` home → hub `/`. */
export const Route = createFileRoute('/padajala/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', statusCode: 301 });
  }
});
