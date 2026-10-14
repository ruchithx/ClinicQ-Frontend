'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@/features/auth/auth-context';
import { getRoleHome } from '@/lib/auth/roles';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function HomePage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(getRoleHome(user.roles) as Route);
    } else if (status === 'anonymous') {
      router.replace('/login' as Route);
    }
  }, [status, user, router]);

  return <LoadingSkeleton variant="page" />;
}
