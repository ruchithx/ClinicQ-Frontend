'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useEffect } from 'react';
import { NewConsultationForm } from '@/features/consultations/NewConsultationForm';

export function NewConsultationPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get('patientId');

  useEffect(() => {
    if (!patientId) {
      router.replace('/doctor/patients/search' as Route);
    }
  }, [patientId, router]);

  if (!patientId) return null;

  return <NewConsultationForm patientId={patientId} />;
}
