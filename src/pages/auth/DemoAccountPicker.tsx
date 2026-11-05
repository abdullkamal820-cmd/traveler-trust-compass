import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Backpack, Briefcase, Plane, Hotel, ShieldCheck, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount, type DemoRole } from '@/lib/demoAccounts';

const ROLE_STYLES: Record<DemoRole, { label: string; badge: string; iconBox: string; icon: typeof Plane }> = {
  traveler: { label: 'Traveler', badge: 'bg-turquoise-100 text-turquoise-800', iconBox: 'bg-turquoise-50 text-turquoise-700', icon: Plane },
  business: { label: 'Business', badge: 'bg-blue-100 text-blue-800', iconBox: 'bg-blue-50 text-blue-700', icon: Briefcase },
  admin: { label: 'Admin', badge: 'bg-navy-100 text-navy-800', iconBox: 'bg-navy-100 text-navy-800', icon: ShieldCheck },
};

const PERSONA_ICONS: Record<string, typeof Plane> = {
  leo: Backpack,
  hana: Plane,
  skyline: Briefcase,
  serena: Hotel,
  dana: ShieldCheck,
};

export function DemoAccountPicker() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDemoSignIn = async (account: DemoAccount) => {
    setError(null);
    setSigningInId(account.id);
    const { error } = await signIn(account.email, DEMO_PASSWORD);
    if (error) {
      setError(`Could not sign in as ${account.name}. ${error}`);
      setSigningInId(null);
      return;
    }
    navigate('/');
  };

  return (
    <div className="mt-8 pt-6 border-t border-navy-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-navy-200 hover:border-turquoise-400 hover:bg-turquoise-50/40 transition-all duration-200"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Sparkles size={16} className="text-turquoise-600" />
          Explore with a demo account
        </span>
        <ChevronDown size={18} className={`text-navy-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <p className="text-xs text-navy-500">
            Each demo account has its own personality and sample data. Pick one to see the platform from that point of view.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((account) => {
              const style = ROLE_STYLES[account.role];
              const PersonaIcon = PERSONA_ICONS[account.id] ?? style.icon;
              const busy = signingInId === account.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  disabled={signingInId !== null}
                  onClick={() => handleDemoSignIn(account)}
                  className="group text-left p-4 rounded-xl bg-white border border-navy-200 hover:border-turquoise-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.iconBox}`}>
                      <PersonaIcon size={20} />
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${style.badge}`}>{style.label}</span>
                  </div>
                  <p className="font-semibold text-navy-900 mt-3">{account.name}</p>
                  <p className="text-sm font-medium text-turquoise-700">{account.title}</p>
                  <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">{account.personality}</p>
                  <ul className="mt-3 space-y-1">
                    {account.highlights.map((item) => (
                      <li key={item} className="text-xs text-navy-600 flex items-start gap-1.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-turquoise-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs font-semibold text-turquoise-700 flex items-center gap-1.5">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                    {busy ? 'Signing in...' : 'Sign in as this persona'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
