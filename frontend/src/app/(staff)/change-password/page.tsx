import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';

export const metadata: Metadata = { title: 'Change Password' };

export default function ChangePasswordPage() {
  return (
    <RequireAuth>
      <div className="p-6">
        <ChangePasswordForm />
      </div>
    </RequireAuth>
  );
}
