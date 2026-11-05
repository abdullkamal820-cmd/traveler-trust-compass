import { useEffect, useState } from 'react';
import { Calendar, Plus, Plane, MapPin, Search, Filter, User2, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, EmptyState, StatusBadge, Spinner, PageHeader, Modal, Toast } from '@/components/ui';
import { BookingPaymentForm } from '@/components/BookingPaymentForm';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';
import { PAYMENT_METHOD_LABELS, formatAmount, isBookingPaid } from '@/lib/payment';
import type { Booking, Business, Profile, Identity } from '@/types';

export function BusinessBookings() {
  const { profile } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [travelerQuery, setTravelerQuery] = useState('');
  const [foundTraveler, setFoundTraveler] = useState<Profile | null>(null);
  const [foundIdentity, setFoundIdentity] = useState<Identity | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: bizData } = await supabase.from('businesses').select('*').eq('user_id', profile.id).maybeSingle();
      setBusiness(bizData as Business | null);
      if (bizData) {
        const { data: bkData } = await supabase
          .from('bookings')
          .select('*, traveler:profiles!traveler_user_id(*)')
          .eq('business_id', bizData.id)
          .order('created_at', { ascending: false });
        setBookings(bkData as Booking[] || []);
      }
      setLoading(false);
    })();
  }, [profile]);

  const searchTraveler = async () => {
    if (!travelerQuery.trim()) return;
    setSearching(true);
    setFoundTraveler(null);
    setFoundIdentity(null);

    const { data: traveler } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'traveler')
      .ilike('full_name', `%${travelerQuery}%`)
      .limit(5);

    if (traveler && traveler.length > 0) {
      setFoundTraveler(traveler[0] as Profile);
      const { data: ident } = await supabase
        .from('identities')
        .select('*')
        .eq('user_id', traveler[0].id)
        .maybeSingle();
      if (ident) setFoundIdentity(ident as Identity);
    }
    setSearching(false);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setTravelerQuery('');
    setFoundTraveler(null);
    setFoundIdentity(null);
  };

  const handleBookingSaved = (booking: Booking) => {
    setBookings((prev) => [booking, ...prev]);
    setToast({ message: 'Booking saved', type: 'success' });
    closeCreate();
  };

  const handlePaymentRecorded = (booking: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? booking : b)));
    setToast({ message: 'Payment recorded', type: 'success' });
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b));
      setToast({ message: 'Booking updated', type: 'success' });
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (b.booking_reference || '').toLowerCase().includes(q) ||
        (b.origin || '').toLowerCase().includes(q) ||
        (b.destination || '').toLowerCase().includes(q) ||
        (b.traveler?.full_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><Spinner size={32} /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title="Bookings"
        subtitle="Create and manage travel bookings for travelers"
        action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={18} />New Booking</button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input className="input pl-11" placeholder="Search by traveler, destination, or reference..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-navy-400" />
          <select className="input py-2.5" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Calendar} title="No bookings yet" description="Create your first booking for a traveler." action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={18} />Create Booking</button>} /></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <Card key={b.id} className="hover:border-turquoise-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center flex-shrink-0">
                  <Plane size={20} className="text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-bold text-navy-900 text-lg">
                      {b.origin || '—'} → {b.destination || '—'}
                    </p>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-navy-400 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5"><User2 size={14} />{b.traveler?.full_name || 'Unknown traveler'}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} />{b.start_date}{b.end_date ? ` → ${b.end_date}` : ''}</span>
                    <span className="capitalize flex items-center gap-1.5"><MapPin size={14} />{b.service_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900"><Wallet size={14} className="text-navy-400" />{formatAmount(b.amount, b.currency)}</span>
                    {isBookingPaid(b) ? (
                      <span className="badge-success">Paid · {b.payment_method ? PAYMENT_METHOD_LABELS[b.payment_method] : '—'}</span>
                    ) : (
                      <span className="badge-warning">Unpaid</span>
                    )}
                    {b.payment_reference && <span className="font-mono text-xs text-navy-500">Ref {b.payment_reference}</span>}
                  </div>
                  {b.notes && <p className="text-sm text-navy-500 mt-2">{b.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="font-mono text-sm text-turquoise-600 font-semibold">{b.booking_reference}</p>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {!isBookingPaid(b) && b.status !== 'cancelled' && (
                      <button onClick={() => setPaymentTarget(b)} className="text-xs px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 font-medium">Record payment</button>
                    )}
                    {b.status !== 'completed' && b.status !== 'cancelled' && (
                      <>
                        {b.status === 'confirmed' && (
                          <button onClick={() => updateBookingStatus(b.id, 'completed')} className="text-xs px-3 py-1.5 rounded-lg bg-turquoise-100 text-turquoise-700 hover:bg-turquoise-200 font-medium">Complete</button>
                        )}
                        {b.status === 'pending' && (
                          <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-turquoise-100 text-turquoise-700 hover:bg-turquoise-200 font-medium">Confirm</button>
                        )}
                        <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={closeCreate} title="Create New Booking" maxWidth="max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="label">Search Traveler by Name</label>
            <div className="flex gap-2">
              <input className="input" placeholder="Enter traveler name..." value={travelerQuery} onChange={(e) => setTravelerQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchTraveler()} />
              <button onClick={searchTraveler} disabled={searching} className="btn-secondary">
                {searching ? <Spinner size={16} /> : <Search size={16} />}
                Search
              </button>
            </div>
          </div>

          {business && foundTraveler && (
            <BookingPaymentForm
              key={foundTraveler.id}
              business={business}
              traveler={foundTraveler}
              identity={foundIdentity}
              onSaved={handleBookingSaved}
              onCancel={closeCreate}
            />
          )}
        </div>
      </Modal>

      <RecordPaymentModal booking={paymentTarget} onClose={() => setPaymentTarget(null)} onRecorded={handlePaymentRecorded} />
    </DashboardLayout>
  );
}
