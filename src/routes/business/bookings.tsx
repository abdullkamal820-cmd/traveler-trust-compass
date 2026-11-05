import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessBookings } from '@/pages/business/BusinessBookings';

export const Route = createFileRoute('/business/bookings')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Bookings | ST&ID' },
      { name: 'description', content: 'Bookings — ST&ID business area.' },
      { property: 'og:title', content: 'Bookings | ST&ID' },
      { property: 'og:description', content: 'Bookings — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessBookings /></ProtectedRoute>,
});
