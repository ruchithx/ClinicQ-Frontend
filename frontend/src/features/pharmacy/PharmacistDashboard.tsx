'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Clock } from 'lucide-react';
import { listPrescriptions } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value === undefined ? '—' : value}
        </div>
      </CardContent>
    </Card>
  );
}

export function PharmacistDashboard() {
  const { data: pending } = useQuery({
    queryKey: queryKeys.prescriptions.list({ status: ['PENDING'] }),
    queryFn: () => listPrescriptions({ status: ['PENDING'], size: 1 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: inProgress } = useQuery({
    queryKey: queryKeys.prescriptions.list({ status: ['IN_PROGRESS'] }),
    queryFn: () => listPrescriptions({ status: ['IN_PROGRESS'], size: 1 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacist Dashboard"
        action={
          <Button asChild>
            <Link href="/pharmacist/prescriptions" as={'/pharmacist/prescriptions' as Route}>
              View all prescriptions
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Pending prescriptions"
          value={pending?.totalItems !== undefined ? Number(pending.totalItems) : undefined}
          icon={ClipboardList}
        />
        <StatCard
          title="In progress"
          value={inProgress?.totalItems !== undefined ? Number(inProgress.totalItems) : undefined}
          icon={Clock}
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          Go to{' '}
          <Link href="/pharmacist/prescriptions" className="font-medium text-foreground hover:underline">
            Prescriptions
          </Link>{' '}
          to view and process pending work.
        </p>
      </div>
    </div>
  );
}
