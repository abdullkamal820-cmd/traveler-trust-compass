import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsProfileCompletion: boolean;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  completeProfile: (role: UserRole, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  // Role comes from the protected profiles.role mirror (maintained by the database from user_roles).
  // A missing role means the user still has to pick traveler/business (e.g. after Google sign-in).
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setNeedsProfileCompletion(true);
      return null;
    }
    const p = data as Profile | null;
    if (!p || !p.role) {
      setProfile(null);
      setNeedsProfileCompletion(true);
      return null;
    }
    setProfile(p);
    setNeedsProfileCompletion(false);
    return p;
  }, []);

  useEffect(() => {
    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      setSession(s);
      if (event === 'TOKEN_REFRESHED') return;
      if (s?.user) {
        // defer DB call out of the auth callback to avoid deadlocks
        setTimeout(() => {
          fetchProfile(s.user.id).finally(() => active && setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setNeedsProfileCompletion(false);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      if (s?.user) fetchProfile(s.user.id).finally(() => active && setLoading(false));
      else setLoading(false);
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, role: UserRole, fullName: string) => {
    if (role !== 'traveler' && role !== 'business') return { error: 'Please choose Traveler or Business.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        // The database only honours 'traveler' or 'business' here; admin can never be self-assigned.
        data: { role, full_name: fullName },
      },
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: null, needsConfirmation: true };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        return { error: 'Please confirm your email first — check your inbox for the confirmation link.' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (result.error) return { error: result.error.message || 'Google sign-in failed' };
    return { error: null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
    if (error) {
      if (/provider|sms|phone/i.test(error.message)) {
        return { error: 'Phone sign-in is not set up yet. Please use email or Google for now.' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const completeProfile = useCallback(
    async (role: UserRole, fullName: string) => {
      if (!session?.user) return { error: 'Not authenticated' };
      const { error } = await supabase.rpc('choose_initial_role', { _role: role, _full_name: fullName });
      if (error) return { error: error.message };
      await fetchProfile(session.user.id);
      return { error: null };
    },
    [session, fetchProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setNeedsProfileCompletion(false);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        session, profile, loading, needsProfileCompletion,
        signUp, signIn, signInWithGoogle, signInWithPhone, verifyPhoneOtp,
        completeProfile, signOut, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
