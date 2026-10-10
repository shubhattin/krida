import { Outlet, createFileRoute } from '@tanstack/react-router';
import { SimpleGameAuthLayout } from '~/components/pages/simple_game/SimpleGameLayouts';
import { requireAdminAccess } from '~/lib/adminServerFn';

export const Route = createFileRoute('/bhramita/(auth)/_auth')({
  beforeLoad: async () => {
    await requireAdminAccess();
  },
  component: AuthLayout
});

function AuthLayout() {
  return (
    <SimpleGameAuthLayout kind="bhramita">
      <Outlet />
    </SimpleGameAuthLayout>
  );
}
