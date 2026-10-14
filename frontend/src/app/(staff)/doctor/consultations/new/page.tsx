import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { NewConsultationPageClient } from './NewConsultationPageClient';

export const metadata: Metadata = { title: 'New Consultation' };

export default function NewConsultationPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR']}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">New Consultation</h1>
        <Suspense fallback={null}>
          <NewConsultationPageClient />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
