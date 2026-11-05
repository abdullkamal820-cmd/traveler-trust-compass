import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { AdminBookings } from '@/pages/admin/AdminBookings';

export const Route = createFileRoute('/admin/bookings')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'All bookings | ST&ID' },
      { name: 'description', content: 'All bookings — ST&ID admin area.' },
      { property: 'og:title', content: 'All bookings | ST&ID' },
      { property: 'og:description', content: 'All bookings — ST&ID admin area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['admin']}><AdminBookings /></ProtectedRoute>,
});
