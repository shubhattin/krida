import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padavali` home → hub `/`. */
export const Route = createFileRoute('/padavali/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', statusCode: 301 });
  }
});
