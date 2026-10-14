import { RequireAuth } from '@/features/auth/RequireAuth';
import { PharmacistPrescriptionDetail } from '@/features/pharmacy/PharmacistPrescriptionDetail';

interface Props {
  params: Promise<{ prescriptionId: string }>;
}

export default async function Page({ params }: Props) {
  const { prescriptionId } = await params;
  return (
    <RequireAuth requiredRoles={['PHARMACIST']}>
      <PharmacistPrescriptionDetail prescriptionId={prescriptionId} />
    </RequireAuth>
  );
}
