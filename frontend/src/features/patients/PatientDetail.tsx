'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { Plus, ChevronRight } from 'lucide-react';
import { getPatient, getMedicalHistory } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDate, formatDateTime, formatAge } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { ConsultationResponse } from '@/lib/api/types';

function ConsultationCard({ consultation }: { consultation: ConsultationResponse }) {
  const activePrescription = consultation.prescriptions.find(
    (p) => p.status !== 'CANCELLED',
  );

  return (
    <Link
      href={`/doctor/consultations/${consultation.id}` as Route}
      className="block rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{formatDateTime(consultation.consultationAt)}</p>
          {consultation.presentingComplaint && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {consultation.presentingComplaint}
            </p>
          )}
          {consultation.diagnoses.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {consultation.diagnoses.map((d) => d.conditionText).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activePrescription && (
            <StatusBadge status={activePrescription.status} />
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

interface PatientDetailProps {
  patientId: string;
}

export function PatientDetail({ patientId }: PatientDetailProps) {
  const router = useRouter();

  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId),
    staleTime: 60_000,
  });

  const { data: history, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: queryKeys.patients.history(patientId),
    queryFn: () => getMedicalHistory(patientId),
    staleTime: 30_000,
    enabled: !!patient,
  });

  if (patientLoading) return <LoadingSkeleton variant="page" />;
  if (patientError) return <ErrorPanel error={patientError} />;
  if (!patient) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.fullName}
        breadcrumb={
          <Link href="/doctor/patients/search" className="hover:underline">
            Patients
          </Link>
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/doctor/consultations/new?patientId=${patient.id}` as Route)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New consultation
            </Button>
          </div>
        }
      />

      {/* Patient info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient #</span>
              <span className="font-mono font-medium">{patient.patientNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sex</span>
              <span>{patient.sex}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of birth</span>
              <span>
                {patient.dateOfBirthEstimated ? '~' : ''}
                {formatDate(patient.dateOfBirth)}{' '}
                <span className="text-muted-foreground">({formatAge(patient.dateOfBirth, patient.dateOfBirthEstimated)})</span>
              </span>
            </div>
            {patient.phoneNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{patient.phoneNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {patient.knownAllergies && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800">Known Allergies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900">{patient.knownAllergies}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Medical history: conditions */}
      {historyLoading && <LoadingSkeleton variant="card" />}
      {historyError && <ErrorPanel error={historyError} />}
      {history && history.conditions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Conditions</h2>
          <div className="flex flex-wrap gap-2">
            {history.conditions.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {c.conditionText}
                {c.icd10Code && <span className="ml-1 text-xs opacity-70">({c.icd10Code})</span>}
                <span className="ml-1 text-xs opacity-70">×{c.occurrences}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Consultation history */}
      {history && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Consultations</h2>
            <span className="text-sm text-muted-foreground">
              {history.consultations.totalItems} total
            </span>
          </div>
          {history.consultations.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No consultations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {history.consultations.items.map((c) => (
                <ConsultationCard key={c.id} consultation={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
