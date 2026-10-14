import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PatientSearchForm } from '@/features/patients/PatientSearchForm';

export const metadata: Metadata = { title: 'Patient Search' };

export default function PatientSearchPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR']}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Patients</h1>
        <PatientSearchForm />
      </div>
    </RequireAuth>
  );
}
