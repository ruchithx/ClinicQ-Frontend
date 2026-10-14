'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Bell } from 'lucide-react';
import { getPublicQueueStatus } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { env } from '@/lib/env';
import { formatTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { Badge } from '@/components/ui/badge';
import type { PublicQueueStatus } from '@/lib/api/types';

const STALE_THRESHOLD_MS = 120_000;

interface PublicQueueDisplayProps {
  queueSessionId: string;
}

function ServingDisplay({ status }: { status: PublicQueueStatus }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Now Serving
      </p>
      {status.currentServingNumber !== null ? (
        <p
          className="font-bold tabular-nums leading-none text-[#1F5F8B]"
          style={{ fontSize: '10rem' }}
          aria-label={`Now serving number ${status.currentServingNumber}`}
        >
          {status.currentServingNumber}
        </p>
      ) : (
        <p className="text-5xl font-semibold text-muted-foreground">—</p>
      )}
      {status.servingNumbers.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Also at counter: {status.servingNumbers.slice(1).map((n) => `#${n}`).join(', ')}
        </p>
      )}
    </div>
  );
}

function MyNumberHelper({ waitingNumbers }: { waitingNumbers: number[] }) {
  const [myNumber, setMyNumber] = useState('');
  const [matched, setMatched] = useState<boolean | null>(null);

  const check = () => {
    const n = parseInt(myNumber, 10);
    if (isNaN(n)) return;
    setMatched(waitingNumbers.includes(n));
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Check my number</p>
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          placeholder="Your queue number"
          value={myNumber}
          onChange={(e) => { setMyNumber(e.target.value); setMatched(null); }}
          className="max-w-[160px]"
          aria-label="Your queue number"
        />
        <Button variant="outline" size="sm" onClick={check}>
          Check
        </Button>
      </div>
      {matched !== null && (
        <p
          className={matched ? 'text-sm text-emerald-700 font-medium' : 'text-sm text-muted-foreground'}
          role="status"
        >
          {matched
            ? `#${myNumber} is in the waiting list.`
            : `#${myNumber} is not currently in the waiting list.`}
        </p>
      )}
    </div>
  );
}

export function PublicQueueDisplay({ queueSessionId }: PublicQueueDisplayProps) {
  const etagRef = useRef<string | undefined>(undefined);
  // Stored in state so we can read them during render without ref access
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [isStale, setIsStale] = useState(false);

  // Periodic staleness check — all setState calls are inside setInterval callback (async)
  useEffect(() => {
    const check = () => {
      setIsStale(lastUpdateTime > 0 && Date.now() - lastUpdateTime > STALE_THRESHOLD_MS);
    };
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [lastUpdateTime]);

  const { data: status, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.public.queueStatus(queueSessionId),
    queryFn: async () => {
      const result = await getPublicQueueStatus(queueSessionId, etagRef.current);
      if ('notModified' in result) {
        return null;
      }
      // Async context — setState calls here are fine
      etagRef.current = result.etag;
      setLastUpdateTime(Date.now());
      setIsStale(false);
      return result.data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: env.NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });

  if (isLoading && !status) return <LoadingSkeleton variant="page" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!status) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <Link
        href="/public/queue"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All queues
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{status.name}</h1>
          <p className="text-sm text-muted-foreground">{status.sessionDate}</p>
        </div>
        <Badge variant={status.status === 'OPEN' ? 'default' : 'outline'}>
          {status.status}
        </Badge>
      </div>

      {isStale && (
        <div
          className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>Data may be outdated. Waiting for server update…</span>
        </div>
      )}

      {status.status !== 'OPEN' && (
        <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
          This queue session is {status.status.toLowerCase()}.
        </div>
      )}

      <ServingDisplay status={status} />

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold tabular-nums">{status.waitingCount}</p>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wide">Waiting</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold tabular-nums">{status.lastIssuedNumber}</p>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wide">Last issued</p>
        </div>
      </div>

      <MyNumberHelper waitingNumbers={status.waitingNumbers} />

      <p className="text-center text-xs text-muted-foreground">
        Updated {formatTime(status.updatedAt)}
      </p>
    </div>
  );
}
