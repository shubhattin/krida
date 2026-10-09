import { Outlet, createFileRoute } from '@tanstack/react-router';
import { SimpleGamePublicLayout } from '~/components/pages/simple_game/SimpleGameLayouts';

export const Route = createFileRoute('/bhramitA/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <SimpleGamePublicLayout kind="bhramita">
      <Outlet />
    </SimpleGamePublicLayout>
  );
}
