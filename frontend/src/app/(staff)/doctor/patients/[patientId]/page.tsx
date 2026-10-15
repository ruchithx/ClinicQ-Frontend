import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PatientDetail } from '@/features/patients/PatientDetail';

export const metadata: Metadata = { title: 'Patient' };

interface Props {
  params: Promise<{ patientId: string }>;
}

export default async function PatientDetailPage({ params }: Props) {
  const { patientId } = await params;
  return (
    <RequireAuth requiredRoles={['DOCTOR', 'ADMIN']}>
      <div className="p-6">
        <PatientDetail patientId={patientId} />
      </div>
    </RequireAuth>
  );
}
