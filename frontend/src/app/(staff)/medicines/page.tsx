import { RequireAuth } from '@/features/auth/RequireAuth';
import { PageHeader } from '@/components/PageHeader';
import { MedicineList } from '@/features/medicines/MedicineList';

export default function Page() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <PageHeader title="Medicine catalogue" />
        <MedicineList />
      </div>
    </RequireAuth>
  );
}
