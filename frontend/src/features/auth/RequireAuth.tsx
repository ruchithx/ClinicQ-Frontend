'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import { useAuth } from './auth-context';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface RequireAuthProps {
  requiredRoles?: string[];
  children: ReactNode;
}

export function RequireAuth({ requiredRoles, children }: RequireAuthProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}` as Route);
    } else if (
      status === 'authenticated' &&
      user?.mustChangePassword &&
      pathname !== '/change-password'
    ) {
      router.replace('/change-password' as Route);
    }
  }, [status, user, pathname, router]);

  if (status === 'loading') {
    return <LoadingSkeleton variant="page" />;
  }

  if (status === 'anonymous') {
    return null; // redirect in effect
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.some((r) => user?.roles.includes(r))
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
