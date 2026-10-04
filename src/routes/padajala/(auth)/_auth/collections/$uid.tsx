import { createFileRoute, redirect } from '@tanstack/react-router';

/** Deprecated: collections are edited at the shared `/collections/edit/$uid` page. */
export const Route = createFileRoute('/padajala/(auth)/_auth/collections/$uid')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/collections/edit/$uid', params: { uid: params.uid } });
  },
  component: () => null
});
