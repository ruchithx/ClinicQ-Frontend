import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { NewPatientForm } from '@/features/patients/NewPatientForm';

export const metadata: Metadata = { title: 'New Patient' };

export default function NewPatientPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR']}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Register New Patient</h1>
        <NewPatientForm />
      </div>
    </RequireAuth>
  );
}
