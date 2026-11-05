import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessVerifications } from '@/pages/business/BusinessVerifications';

export const Route = createFileRoute('/business/verifications')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Verifications | ST&ID' },
      { name: 'description', content: 'Verifications — ST&ID business area.' },
      { property: 'og:title', content: 'Verifications | ST&ID' },
      { property: 'og:description', content: 'Verifications — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessVerifications /></ProtectedRoute>,
});
