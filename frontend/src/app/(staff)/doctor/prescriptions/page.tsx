import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PrescriptionList } from '@/features/prescriptions/PrescriptionList';

export const metadata: Metadata = { title: 'My Prescriptions' };

export default function DoctorPrescriptionsPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR']}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">My Prescriptions</h1>
        <PrescriptionList />
      </div>
    </RequireAuth>
  );
}
