'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-context';

interface RoleGateProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Hides UI elements the user cannot use. NOT a security control — the API enforces access. */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(roles) ? <>{children}</> : <>{fallback}</>;
}
