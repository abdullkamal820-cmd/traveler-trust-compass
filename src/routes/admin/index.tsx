import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

export const Route = createFileRoute('/admin/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Admin dashboard | ST&ID' },
      { name: 'description', content: 'Admin dashboard — ST&ID admin area.' },
      { property: 'og:title', content: 'Admin dashboard | ST&ID' },
      { property: 'og:description', content: 'Admin dashboard — ST&ID admin area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>,
});
