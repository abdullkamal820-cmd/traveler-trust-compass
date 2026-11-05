import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessReports } from '@/pages/business/BusinessReports';

export const Route = createFileRoute('/business/reports')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Reports | ST&ID' },
      { name: 'description', content: 'Reports — ST&ID business area.' },
      { property: 'og:title', content: 'Reports | ST&ID' },
      { property: 'og:description', content: 'Reports — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessReports /></ProtectedRoute>,
});
