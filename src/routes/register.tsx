import { createFileRoute } from '@tanstack/react-router';
import { GuestOnly } from '@/components/RouteGuards';
import { AuthPage } from '@/pages/auth/AuthPage';

export const Route = createFileRoute('/register')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Create account | ST&ID' },
      { name: 'description', content: 'Create a traveler or business account on ST&ID.' },
      { property: 'og:title', content: 'Create account | ST&ID' },
      { property: 'og:description', content: 'Create a traveler or business account on ST&ID.' },
    ],
  }),
  component: () => <GuestOnly><AuthPage mode="register" /></GuestOnly>,
});
