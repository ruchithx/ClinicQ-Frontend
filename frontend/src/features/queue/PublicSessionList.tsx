'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Route } from 'next';
import { Users, Clock } from 'lucide-react';
import { listPublicQueueSessions } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import type { PublicQueueSessionSummary } from '@/lib/api/types';

function statusLabel(status: PublicQueueSessionSummary['status']): string {
  switch (status) {
    case 'OPEN': return 'Open';
    case 'CLOSED': return 'Closed';
    case 'SCHEDULED': return 'Scheduled';
    default: return status;
  }
}

function statusVariant(
  status: PublicQueueSessionSummary['status'],
): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'OPEN': return 'default';
    case 'SCHEDULED': return 'secondary';
    default: return 'outline';
  }
}

export function PublicSessionList() {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.public.queueSessions(),
    queryFn: () => listPublicQueueSessions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingSkeleton variant="card" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!data) return null;

  const sessions = data.items;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{formatDate(data.date)}</p>

      {sessions.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No queue sessions today.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/public/queue/${session.id}` as Route}
            className="block"
          >
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{session.name}</CardTitle>
                  <Badge variant={statusVariant(session.status)}>
                    {statusLabel(session.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {session.currentServingNumber !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Now serving: <strong className="text-foreground">#{session.currentServingNumber}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{session.waitingCount} waiting</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
