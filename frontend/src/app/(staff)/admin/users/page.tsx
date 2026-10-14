import { RequireAuth } from '@/features/auth/RequireAuth';
import { PageHeader } from '@/components/PageHeader';
import { UserList } from '@/features/admin/UserList';

export default function Page() {
  return (
    <RequireAuth requiredRoles={['ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Users" />
        <UserList />
      </div>
    </RequireAuth>
  );
}
