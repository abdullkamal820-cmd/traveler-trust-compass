import { useState, type FormEvent } from 'react';
import { Smartphone, Wallet, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import type { Booking, Business, Identity, PaymentMethod, Profile, ServiceType } from '@/types';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { value: 'instapay', label: 'InstaPay', hint: 'Bank transfer via InstaPay', icon: Smartphone },
  { value: 'vodafone_cash', label: 'Vodafone Cash', hint: 'Mobile wallet payment', icon: Wallet },
];

interface BookingPaymentFormProps {
  business: Business;
  traveler: Profile;
  identity: Identity | null;
  onSaved: (booking: Booking) => void;
  onCancel: () => void;
}

export function BookingPaymentForm({ business, traveler, identity, onSaved, onCancel }: BookingPaymentFormProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [markPaid, setMarkPaid] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError('Enter the travel value in EGP. It must be greater than zero.');
      return;
    }
    if (!paymentMethod) {
      setError('Choose how the traveler pays: InstaPay or Vodafone Cash.');
      return;
    }
    if (markPaid && !reference.trim()) {
      setError('Enter the transaction reference from the payment app to record the payment as received.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError('The end date cannot be before the start date.');
      return;
    }

    setSaving(true);
    const paidNow = markPaid;
    const { data, error: insertError } = await supabase
      .from('bookings')
      .insert({
        business_id: business.id,
        traveler_user_id: traveler.id,
        identity_id: identity?.id ?? null,
        service_type: serviceType,
        origin: origin.trim() || null,
        destination: destination.trim() || null,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate || null,
        notes: notes.trim() || null,
        status: paidNow ? 'confirmed' : 'pending',
        amount: value,
        currency: 'EGP',
        payment_method: paymentMethod,
        payment_reference: reference.trim() || null,
        payment_status: paidNow ? 'paid' : 'unpaid',
        paid_at: paidNow ? new Date().toISOString() : null,
      })
      .select('*, traveler:profiles!traveler_user_id(*)')
      .maybeSingle();
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (!data) {
      setError('The booking could not be saved. Please try again.');
      return;
    }
    onSaved(data as Booking);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-xl bg-turquoise-50 border border-turquoise-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-turquoise-500 flex items-center justify-center text-white font-semibold">
          {traveler.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-navy-900 truncate">{traveler.full_name}</p>
          <p className="text-xs text-navy-500 font-mono truncate">
            {identity ? `Passport ${identity.passport_number}` : 'No digital identity on file'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Service Type</label>
          <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
            <option value="car_rental">Car Rental</option>
            <option value="tour">Tour</option>
            <option value="cruise">Cruise</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Travel Value (EGP)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 4500"
            required
          />
        </div>
        <div><label className="label">Origin</label><input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Cairo" /></div>
        <div><label className="label">Destination</label><input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Paris" /></div>
        <div><label className="label">Start Date</label><input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><label className="label">End Date</label><input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>

      <div>
        <label className="label">Payment Method</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {PAYMENT_OPTIONS.map((option) => {
            const selected = paymentMethod === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPaymentMethod(option.value)}
                aria-pressed={selected}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selected ? 'border-turquoise-500 bg-turquoise-50' : 'border-navy-200 bg-white hover:border-navy-300'
                }`}
              >
                <option.icon size={20} className={selected ? 'text-turquoise-600' : 'text-navy-400'} />
                <p className={`font-semibold mt-2 ${selected ? 'text-turquoise-700' : 'text-navy-800'}`}>{option.label}</p>
                <p className="text-xs text-navy-500">{option.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-xl border border-navy-200 bg-white cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-turquoise-600"
          checked={markPaid}
          onChange={(e) => setMarkPaid(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-navy-800">Payment already received</span>
          <span className="block text-xs text-navy-500">Tick this after the traveler has paid. Enter the transaction reference from the payment app.</span>
        </span>
      </label>

      {(markPaid || reference) && (
        <div>
          <label className="label">Transaction Reference</label>
          <input className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 20261105ABC123" />
        </div>
      )}

      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input min-h-[80px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional booking details..." />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? 'Saving...' : 'Save Booking'}
        </button>
      </div>
      {saving && <span className="sr-only"><Spinner size={12} /></span>}
    </form>
  );
}
