import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { TravelerVerifications } from '@/pages/traveler/TravelerVerifications';

export const Route = createFileRoute('/traveler/verifications')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Verifications | ST&ID' },
      { name: 'description', content: 'Verifications — ST&ID traveler area.' },
      { property: 'og:title', content: 'Verifications | ST&ID' },
      { property: 'og:description', content: 'Verifications — ST&ID traveler area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['traveler']}><TravelerVerifications /></ProtectedRoute>,
});
