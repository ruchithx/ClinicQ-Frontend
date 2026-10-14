import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PrescriptionList } from '@/features/prescriptions/PrescriptionList';

export const metadata: Metadata = { title: 'Doctor Dashboard' };

export default function DoctorDashboardPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR']}>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">My Prescriptions</h1>
        <PrescriptionList />
      </div>
    </RequireAuth>
  );
}
