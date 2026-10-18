import { createFileRoute, redirect } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';
import { SystemPromptsPage } from '~/components/pages/system_prompts/SystemPromptsPage';

export const Route = createFileRoute('/system-prompts')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Image System Prompts | Krida',
      project: 'landing_page',
      description: 'Manage image system prompt templates for image generation.',
      robots: 'noindex'
    }),
  component: SystemPromptsPageRoute
});

function SystemPromptsPageRoute() {
  return <SystemPromptsPage />;
}
