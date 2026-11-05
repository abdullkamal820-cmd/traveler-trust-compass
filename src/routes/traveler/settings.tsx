import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/RouteGuards';
import { SettingsPage } from '@/pages/shared/SettingsPage';

export const Route = createFileRoute('/traveler/settings')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Settings | ST&ID' },
      { name: 'description', content: 'Settings — ST&ID traveler area.' },
      { property: 'og:title', content: 'Settings | ST&ID' },
      { property: 'og:description', content: 'Settings — ST&ID traveler area.' },
    ],
  }),
  component: () => <ProtectedRoute allowedRoles={['traveler']}><SettingsPage role="traveler" /></ProtectedRoute>,
});
