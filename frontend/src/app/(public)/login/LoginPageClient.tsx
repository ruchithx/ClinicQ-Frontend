'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@/features/auth/auth-context';
import { LoginForm } from '@/features/auth/LoginForm';
import { getRoleHome } from '@/lib/auth/roles';
import { env } from '@/lib/env';

export function LoginPageClient() {
  const { status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const reason = searchParams.get('reason');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      const destination =
        nextParam && /^\/[^/]/.test(nextParam) ? nextParam : getRoleHome(user.roles);
      router.replace(destination as Route);
    }
  }, [status, user, router, nextParam]);

  if (status === 'authenticated') return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1F5F8B]">{env.NEXT_PUBLIC_APP_NAME}</h1>
        </div>
        <LoginForm reason={reason} />
      </div>
    </div>
  );
}
