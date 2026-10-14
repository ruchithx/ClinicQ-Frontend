import { RequireAuth } from '@/features/auth/RequireAuth';
import { PharmacistPrescriptionList } from '@/features/pharmacy/PharmacistPrescriptionList';
import { PageHeader } from '@/components/PageHeader';

export default function Page() {
  return (
    <RequireAuth requiredRoles={['PHARMACIST']}>
      <div className="space-y-6">
        <PageHeader title="Prescriptions" />
        <PharmacistPrescriptionList />
      </div>
    </RequireAuth>
  );
}
