import { RequireAuth } from '@/features/auth/RequireAuth';
import { PageHeader } from '@/components/PageHeader';
import { AuditEventList } from '@/features/admin/AuditEventList';

export default function Page() {
  return (
    <RequireAuth requiredRoles={['ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Audit log" />
        <AuditEventList />
      </div>
    </RequireAuth>
  );
}
