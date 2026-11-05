// Small adapter so the original pages (written for react-router) run on TanStack Router.
import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import {
  Link as TsLink,
  useNavigate as useTsNavigate,
  useRouterState,
} from '@tanstack/react-router';

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children?: ReactNode };

export function Link({ to, children, ...rest }: LinkProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TsLink to={to as any} {...(rest as any)}>{children}</TsLink>;
}

export function useNavigate() {
  const navigate = useTsNavigate();
  return (to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any, replace: opts?.replace });
  };
}

export function useLocation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return { pathname };
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return null;
}
