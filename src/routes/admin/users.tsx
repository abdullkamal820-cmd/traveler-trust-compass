import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { AdminUsers } from '@/pages/admin/AdminUsers';

export const Route = createFileRoute('/admin/users')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Users | ST&ID' },
      { name: 'description', content: 'Users — ST&ID admin area.' },
      { property: 'og:title', content: 'Users | ST&ID' },
      { property: 'og:description', content: 'Users — ST&ID admin area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>,
});
