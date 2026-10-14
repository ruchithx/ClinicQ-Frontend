import { RequireAuth } from '@/features/auth/RequireAuth';
import { UserDetail } from '@/features/admin/UserDetail';

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return (
    <RequireAuth requiredRoles={['ADMIN']}>
      <UserDetail userId={userId} />
    </RequireAuth>
  );
}
