import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessSettings } from '@/pages/business/BusinessSettings';

export const Route = createFileRoute('/business/settings')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Business settings | ST&ID' },
      { name: 'description', content: 'Business settings — ST&ID business area.' },
      { property: 'og:title', content: 'Business settings | ST&ID' },
      { property: 'og:description', content: 'Business settings — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessSettings /></ProtectedRoute>,
});
