'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Route } from 'next';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { listQueueSessions } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateQueueSessionForm } from './CreateQueueSessionForm';
import type { QueueSessionResponse } from '@/lib/api/types';

function todayISO(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

function SessionRow({ session }: { session: QueueSessionResponse }) {
  return (
    <Link
      href={`/queue/${session.id}` as Route}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{session.name}</span>
          <StatusBadge status={session.status} showPulse={session.status === 'OPEN'} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatDate(session.sessionDate)}
          {session.assignedDoctor && ` · Dr. ${session.assignedDoctor.fullName}`}
        </p>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <span>{session.counts.waiting} waiting</span>
          <span>{session.counts.serving} serving</span>
          <span>{session.counts.completed} done</span>
          {session.counts.cancelled > 0 && <span>{session.counts.cancelled} cancelled</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium tabular-nums">{session.lastIssuedNumber}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export function QueueSessionList() {
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.queueSessions.list({ date: dateFilter }),
    queryFn: () => listQueueSessions({ date: dateFilter, size: 50 }),
    staleTime: 15_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasOpen = items.some((s) => s.status === 'OPEN');
      return hasOpen ? 30_000 : false;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto"
          aria-label="Filter by date"
        />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New session
        </Button>
      </div>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && data.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No queue sessions for {dateFilter}.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New queue session</DialogTitle>
          </DialogHeader>
          <CreateQueueSessionForm
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
