import type { ReactNode } from 'react';
import { Navigate } from '@/lib/router-compat';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/ui';
import type { UserRole } from '@/types';

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: UserRole[] }) {
  const { profile, session, loading, needsProfileCompletion } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session && needsProfileCompletion) return <Navigate to="/complete-profile" />;
  if (!profile) return <Navigate to="/login" />;
  if (!allowedRoles.includes(profile.role)) return <Navigate to={`/${profile.role}`} />;
  return <>{children}</>;
}

export function RootRedirect() {
  const { profile, session, loading, needsProfileCompletion } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session && needsProfileCompletion) return <Navigate to="/complete-profile" />;
  if (!profile) return <Navigate to="/login" />;
  return <Navigate to={`/${profile.role}`} />;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { profile, session, loading, needsProfileCompletion } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session && needsProfileCompletion) return <Navigate to="/complete-profile" />;
  if (profile) return <Navigate to={`/${profile.role}`} />;
  return <>{children}</>;
}

export function NeedsSession({ children }: { children: ReactNode }) {
  const { session, loading, needsProfileCompletion, profile } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" />;
  if (profile && !needsProfileCompletion) return <Navigate to={`/${profile.role}`} />;
  return <>{children}</>;
}
