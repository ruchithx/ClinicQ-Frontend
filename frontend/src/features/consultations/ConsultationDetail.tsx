'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { Plus } from 'lucide-react';
import { getConsultation } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { env } from '@/lib/env';
import { formatDateTime, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { PrescriptionResponse } from '@/lib/api/types';

function PrescriptionCard({ rx }: { rx: PrescriptionResponse }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Prescription #{rx.prescriptionNumber}
          </CardTitle>
          <StatusBadge status={rx.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rx.notes && (
          <p className="text-sm text-muted-foreground">{rx.notes}</p>
        )}
        <div className="divide-y">
          {rx.items.map((item, i) => (
            <div key={item.id} className="py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  {i + 1}. {item.medicineName}
                  {item.strength && ` ${item.strength}`}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {item.dosageForm ?? ''}
                </span>
              </div>
              <p className="text-muted-foreground">
                {item.dose} · {item.frequency}
                {item.durationDays ? ` · ${item.durationDays} days` : ''}
                {' · '}{item.quantity} {item.quantityUnit}
              </p>
              {item.instructions && (
                <p className="text-xs text-muted-foreground italic">{item.instructions}</p>
              )}
            </div>
          ))}
        </div>
        {rx.status === 'PENDING' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/pharmacist/prescriptions/${rx.id}` as Route)}
          >
            View in pharmacy
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ConsultationDetailProps {
  consultationId: string;
}

export function ConsultationDetail({ consultationId }: ConsultationDetailProps) {
  const router = useRouter();
  const etagRef = useRef<string | undefined>(undefined);

  const { data: consultation, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.consultations.detail(consultationId),
    queryFn: async () => {
      const result = await getConsultation(consultationId, etagRef.current);
      if ('notModified' in result) return null;
      etagRef.current = result.etag;
      return result.data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: env.NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });

  if (isLoading && !consultation) return <LoadingSkeleton variant="page" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!consultation) return null;

  const activePrescription = consultation.prescriptions.find((p) => p.status !== 'CANCELLED');
  const cancelledPrescriptions = consultation.prescriptions.filter(
    (p) => p.status === 'CANCELLED',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Consultation — ${formatDate(consultation.consultationAt)}`}
        breadcrumb={
          <>
            <Link href="/doctor/patients/search" className="hover:underline">Patients</Link>
            {' / '}
            <Link href={`/doctor/patients/${consultation.patient.id}` as Route} className="hover:underline">
              {consultation.patient.fullName}
            </Link>
          </>
        }
        action={
          !activePrescription && (
            <Button
              size="sm"
              onClick={() =>
                router.push(`/doctor/consultations/${consultationId}/add-prescription` as Route)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add prescription
            </Button>
          )
        }
      />

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDateTime(consultation.consultationAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doctor</span>
              <span>{consultation.doctor.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient</span>
              <Link
                href={`/doctor/patients/${consultation.patient.id}` as Route}
                className="font-medium hover:underline"
              >
                {consultation.patient.fullName}
              </Link>
            </div>
          </CardContent>
        </Card>

        {consultation.presentingComplaint && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Presenting Complaint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{consultation.presentingComplaint}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {consultation.clinicalNotes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{consultation.clinicalNotes}</p>
          </CardContent>
        </Card>
      )}

      {consultation.diagnoses.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold">Diagnoses</h2>
          <div className="flex flex-wrap gap-2">
            {consultation.diagnoses.map((d, i) => (
              <Badge key={i} variant="secondary">
                {d.conditionText}
                {d.icd10Code && (
                  <span className="ml-1 font-mono text-xs opacity-70">({d.icd10Code})</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active prescription */}
      {activePrescription ? (
        <div>
          <h2 className="mb-2 text-base font-semibold">Prescription</h2>
          <PrescriptionCard rx={activePrescription} />
        </div>
      ) : (
        <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          No active prescription. Click &quot;Add prescription&quot; to add one.
        </div>
      )}

      {/* Cancelled prescriptions */}
      {cancelledPrescriptions.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-muted-foreground">
            Previous prescriptions
          </h2>
          <div className="space-y-2">
            {cancelledPrescriptions.map((rx) => (
              <PrescriptionCard key={rx.id} rx={rx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
