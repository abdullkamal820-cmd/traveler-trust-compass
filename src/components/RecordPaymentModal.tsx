import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui';
import { PAYMENT_METHOD_LABELS, formatAmount } from '@/lib/payment';
import type { Booking, PaymentMethod } from '@/types';

interface RecordPaymentModalProps {
  booking: Booking | null;
  onClose: () => void;
  onRecorded: (booking: Booking) => void;
}

export function RecordPaymentModal({ booking, onClose, onRecorded }: RecordPaymentModalProps) {
  return (
    <Modal open={!!booking} onClose={onClose} title="Record Payment" maxWidth="max-w-md">
      {booking && <RecordPaymentForm key={booking.id} booking={booking} onClose={onClose} onRecorded={onRecorded} />}
    </Modal>
  );
}

function RecordPaymentForm({ booking, onClose, onRecorded }: { booking: Booking; onClose: () => void; onRecorded: (booking: Booking) => void }) {
  const [method, setMethod] = useState<PaymentMethod | null>(booking.payment_method);
  const [reference, setReference] = useState(booking.payment_reference ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!method) {
      setError('Choose how the traveler paid: InstaPay or Vodafone Cash.');
      return;
    }
    if (!reference.trim()) {
      setError('Enter the transaction reference from the payment app.');
      return;
    }

    setSaving(true);
    const { data, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: method,
        payment_reference: reference.trim(),
        paid_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .select('*, traveler:profiles!traveler_user_id(*)')
      .maybeSingle();
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!data) {
      setError('The payment could not be recorded. Please try again.');
      return;
    }
    onRecorded(data as Booking);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-navy-500">
        Amount due: <span className="font-semibold text-navy-900">{formatAmount(booking.amount, booking.currency)}</span>
      </p>
      <div>
        <label className="label">Payment Method</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              aria-pressed={method === value}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                method === value ? 'border-turquoise-500 bg-turquoise-50 text-turquoise-700' : 'border-navy-200 bg-white text-navy-700 hover:border-navy-300'
              }`}
            >
              {PAYMENT_METHOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Transaction Reference</label>
        <input className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 20261105ABC123" />
      </div>
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving...' : 'Mark as Paid'}
        </button>
      </div>
    </form>
  );
}
