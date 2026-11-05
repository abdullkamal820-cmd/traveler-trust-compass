export type DemoRole = 'traveler' | 'business' | 'admin';

export interface DemoAccount {
  id: string;
  email: string;
  role: DemoRole;
  name: string;
  title: string;
  personality: string;
  highlights: string[];
}

// Admin demo intentionally removed: a public password must never unlock the admin dashboard.
export const DEMO_PASSWORD = 'StidDemo2026!';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'leo',
    email: 'leo.marchetti@demo.stid.test',
    role: 'traveler',
    name: 'Leo Marchetti',
    title: 'The Adventurous Backpacker',
    personality: 'Spontaneous and curious, always planning the next mountain trail.',
    highlights: ['Verified digital ID', 'Upcoming flight and hotel', 'Pending identity mismatch'],
  },
  {
    id: 'hana',
    email: 'hana.sato@demo.stid.test',
    role: 'traveler',
    name: 'Hana Sato',
    title: 'The Meticulous Business Traveler',
    personality: 'Organized and detail-driven, with a history of smooth, completed trips.',
    highlights: ['Verified digital ID', 'Completed flight and hotel', 'Trip history'],
  },
  {
    id: 'skyline',
    email: 'skyline@demo.stid.test',
    role: 'business',
    name: 'Skyline Airways',
    title: 'The Efficient Airline',
    personality: 'Fast, precise, and focused on boarding passengers on time.',
    highlights: ['Verifies travelers at check-in', 'Issues flight bookings', 'Verification history'],
  },
  {
    id: 'serena',
    email: 'serena@demo.stid.test',
    role: 'business',
    name: 'Casa Serena Hotel',
    title: 'The Warm Hospitality Host',
    personality: 'Welcoming and attentive, with a careful eye on every guest arrival.',
    highlights: ['Verifies hotel guests', 'Raises mismatch reports', 'Manages stays'],
  },
];
