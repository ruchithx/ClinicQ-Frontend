import { RequireAuth } from '@/features/auth/RequireAuth';
import { AppShell } from '@/components/AppShell';
import type { ReactNode } from 'react';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
