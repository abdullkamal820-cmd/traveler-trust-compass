import { createFileRoute } from '@tanstack/react-router';
import { NeedsSession } from '@/components/RouteGuards';
import { CompleteProfilePage } from '@/pages/auth/CompleteProfilePage';

export const Route = createFileRoute('/complete-profile')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Complete profile | ST&ID' },
      { name: 'description', content: 'Finish setting up your ST&ID account.' },
      { property: 'og:title', content: 'Complete profile | ST&ID' },
      { property: 'og:description', content: 'Finish setting up your ST&ID account.' },
    ],
  }),
  component: () => <NeedsSession><CompleteProfilePage /></NeedsSession>,
});
