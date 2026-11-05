import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { TravelerTrips } from '@/pages/traveler/TravelerTrips';

export const Route = createFileRoute('/traveler/trips')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'My trips | ST&ID' },
      { name: 'description', content: 'My trips — ST&ID traveler area.' },
      { property: 'og:title', content: 'My trips | ST&ID' },
      { property: 'og:description', content: 'My trips — ST&ID traveler area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['traveler']}><TravelerTrips /></ProtectedRoute>,
});
