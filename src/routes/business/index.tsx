import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessDashboard } from '@/pages/business/BusinessDashboard';

export const Route = createFileRoute('/business/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Dashboard | ST&ID' },
      { name: 'description', content: 'Dashboard — ST&ID business area.' },
      { property: 'og:title', content: 'Dashboard | ST&ID' },
      { property: 'og:description', content: 'Dashboard — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessDashboard /></ProtectedRoute>,
});
