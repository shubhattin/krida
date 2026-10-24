import { createFileRoute } from '@tanstack/react-router';
import { NewChatPanel } from '~/components/pages/agents/NewChatPanel';

export const Route = createFileRoute('/admin/agents/')({
  component: NewChatPanel
});
