import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { AdminVerifications } from '@/pages/admin/AdminVerifications';

export const Route = createFileRoute('/admin/verifications')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'All verifications | ST&ID' },
      { name: 'description', content: 'All verifications — ST&ID admin area.' },
      { property: 'og:title', content: 'All verifications | ST&ID' },
      { property: 'og:description', content: 'All verifications — ST&ID admin area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['admin']}><AdminVerifications /></ProtectedRoute>,
});
