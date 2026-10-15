import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ConsultationDetail } from '@/features/consultations/ConsultationDetail';

export const metadata: Metadata = { title: 'Consultation' };

interface Props {
  params: Promise<{ consultationId: string }>;
}

export default async function ConsultationDetailPage({ params }: Props) {
  const { consultationId } = await params;
  return (
    <RequireAuth requiredRoles={['DOCTOR', 'ADMIN']}>
      <div className="p-6">
        <ConsultationDetail consultationId={consultationId} />
      </div>
    </RequireAuth>
  );
}
