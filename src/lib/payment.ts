import type { Booking, PaymentMethod } from '@/types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  instapay: 'InstaPay',
  vodafone_cash: 'Vodafone Cash',
};

export function formatAmount(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `${new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency || 'EGP'}`;
}

export function isBookingPaid(booking: Pick<Booking, 'payment_status'>): boolean {
  return booking.payment_status === 'paid';
}
