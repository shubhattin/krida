import { createFileRoute } from '@tanstack/react-router';
import { ChatPage } from '~/components/pages/agents/ChatPage';

export const Route = createFileRoute('/admin/agents/$chatId')({
  component: RouteComponent
});

function RouteComponent() {
  const { chatId } = Route.useParams();
  return <ChatPage chatId={chatId} />;
}
