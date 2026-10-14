import { RequireAuth } from '@/features/auth/RequireAuth';
import { PharmacistDashboard } from '@/features/pharmacy/PharmacistDashboard';

export default function Page() {
  return (
    <RequireAuth requiredRoles={['PHARMACIST']}>
      <PharmacistDashboard />
    </RequireAuth>
  );
}
