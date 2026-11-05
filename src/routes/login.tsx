import { createFileRoute } from '@tanstack/react-router';
import { GuestOnly } from '@/components/RouteGuards';
import { AuthPage } from '@/pages/auth/AuthPage';

export const Route = createFileRoute('/login')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Sign in | ST&ID' },
      { name: 'description', content: 'Sign in to your ST&ID travel identity account.' },
      { property: 'og:title', content: 'Sign in | ST&ID' },
      { property: 'og:description', content: 'Sign in to your ST&ID travel identity account.' },
    ],
  }),
  component: () => <GuestOnly><AuthPage mode="login" /></GuestOnly>,
});
