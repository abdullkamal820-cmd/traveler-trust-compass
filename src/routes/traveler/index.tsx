import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { TravelerDashboard } from '@/pages/traveler/TravelerDashboard';

export const Route = createFileRoute('/traveler/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Dashboard | ST&ID' },
      { name: 'description', content: 'Dashboard — ST&ID traveler area.' },
      { property: 'og:title', content: 'Dashboard | ST&ID' },
      { property: 'og:description', content: 'Dashboard — ST&ID traveler area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['traveler']}><TravelerDashboard /></ProtectedRoute>,
});
