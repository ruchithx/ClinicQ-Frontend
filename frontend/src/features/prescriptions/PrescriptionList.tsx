'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight } from 'lucide-react';
import { listPrescriptions } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDateTime } from '@/lib/format';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/features/auth/auth-context';
import type { PrescriptionSummary } from '@/lib/api/types';

function RxRow({ rx, linkBase }: { rx: PrescriptionSummary; linkBase: string }) {
  return (
    <Link
      href={`${linkBase}/${rx.id}` as Route}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{rx.prescriptionNumber}</span>
          <StatusBadge status={rx.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {rx.patient.fullName} · {formatDateTime(rx.submittedAt)} · {rx.itemCount} item{rx.itemCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

interface PrescriptionListProps {
  doctorId?: string;
  linkBase?: string;
}

export function PrescriptionList({
  doctorId,
  linkBase = '/doctor/consultations',
}: PrescriptionListProps) {
  const { user } = useAuth();
  const effectiveDoctorId = doctorId ?? user?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.prescriptions.list({ doctorId: effectiveDoctorId }),
    queryFn: () =>
      listPrescriptions({
        doctorId: effectiveDoctorId,
        size: 30,
        sort: 'submittedAt,desc',
      }),
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!data) return null;

  if (data.items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No prescriptions yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.items.map((rx) => (
        <RxRow key={rx.id} rx={rx} linkBase={linkBase} />
      ))}
    </div>
  );
}
