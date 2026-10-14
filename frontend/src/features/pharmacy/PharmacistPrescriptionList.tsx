'use client';

import { useState } from 'react';
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
import type { PrescriptionSummary, PrescriptionStatus } from '@/lib/api/types';

const TABS: { label: string; status?: PrescriptionStatus | PrescriptionStatus[] }[] = [
  { label: 'Pending', status: 'PENDING' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'Dispensed', status: 'DISPENSED' },
  { label: 'All' },
];

function RxRow({ rx }: { rx: PrescriptionSummary }) {
  return (
    <Link
      href={`/pharmacist/prescriptions/${rx.id}` as Route}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium">{rx.prescriptionNumber}</span>
          <StatusBadge status={rx.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {rx.patient.fullName} · Dr {rx.prescribedBy.fullName} · {formatDateTime(rx.submittedAt)} · {rx.itemCount} item{rx.itemCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

export function PharmacistPrescriptionList() {
  const [activeTab, setActiveTab] = useState(0);

  const { status: tabStatus } = TABS[activeTab] ?? {};

  const statusParam = Array.isArray(tabStatus)
    ? tabStatus
    : tabStatus
      ? [tabStatus]
      : undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.prescriptions.list({ status: statusParam }),
    queryFn: () =>
      listPrescriptions({
        status: statusParam,
        size: 50,
        sort: 'submittedAt,asc',
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit" role="tablist">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
            className={
              activeTab === i
                ? 'rounded-md bg-background px-4 py-1.5 text-sm font-medium shadow-sm'
                : 'rounded-md px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && data.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No prescriptions found.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2" role="tabpanel">
          {data.items.map((rx) => (
            <RxRow key={rx.id} rx={rx} />
          ))}
        </div>
      )}
    </div>
  );
}
