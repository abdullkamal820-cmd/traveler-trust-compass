import { createFileRoute } from '@tanstack/react-router';
import { RootRedirect } from '@/components/RouteGuards';

export const Route = createFileRoute('/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'ST&ID — Smart Travel & Identity' },
      { name: 'description', content: 'Secure digital travel identity: passport scanning, QR verification and bookings for travelers and travel businesses.' },
      { property: 'og:title', content: 'ST&ID — Smart Travel & Identity' },
      { property: 'og:description', content: 'Secure digital travel identity: passport scanning, QR verification and bookings.' },
    ],
  }),
  component: RootRedirect,
});
