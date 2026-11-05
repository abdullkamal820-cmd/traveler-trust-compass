import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { TravelerIdentity } from '@/pages/traveler/TravelerIdentity';

export const Route = createFileRoute('/traveler/identity')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'My identity | ST&ID' },
      { name: 'description', content: 'My identity — ST&ID traveler area.' },
      { property: 'og:title', content: 'My identity | ST&ID' },
      { property: 'og:description', content: 'My identity — ST&ID traveler area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['traveler']}><TravelerIdentity /></ProtectedRoute>,
});
