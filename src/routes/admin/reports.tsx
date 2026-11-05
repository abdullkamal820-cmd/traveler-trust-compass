import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { AdminReports } from '@/pages/admin/AdminReports';

export const Route = createFileRoute('/admin/reports')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Mismatch reports | ST&ID' },
      { name: 'description', content: 'Mismatch reports — ST&ID admin area.' },
      { property: 'og:title', content: 'Mismatch reports | ST&ID' },
      { property: 'og:description', content: 'Mismatch reports — ST&ID admin area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>,
});
