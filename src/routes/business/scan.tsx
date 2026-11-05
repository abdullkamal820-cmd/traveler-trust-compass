import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { BusinessScan } from '@/pages/business/BusinessScan';

export const Route = createFileRoute('/business/scan')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Scan & verify | ST&ID' },
      { name: 'description', content: 'Scan & verify — ST&ID business area.' },
      { property: 'og:title', content: 'Scan & verify | ST&ID' },
      { property: 'og:description', content: 'Scan & verify — ST&ID business area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['business']}><BusinessScan /></ProtectedRoute>,
});
