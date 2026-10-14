'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ChevronRight,
  Loader2,
  ArrowLeft,
  PhoneCall,
  PersonStanding,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  getQueueSession,
  listQueueEntries,
  callNextPatient,
  openQueueSession,
  closeQueueSession,
  callQueueEntry,
  completeQueueEntry,
  skipQueueEntry,
  requeueQueueEntry,
  cancelBooking,
} from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { QueueSessionResponse, QueueEntryResponse } from '@/lib/api/types';

interface QueueSessionDetailProps {
  queueSessionId: string;
}

function EntryRow({
  entry,
  onAction,
}: {
  entry: QueueEntryResponse;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        onAction();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.title : 'Action failed.');
      } finally {
        setBusy(false);
      }
    },
    [onAction],
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="shrink-0 text-center">
        <span className="text-2xl font-bold tabular-nums">#{entry.queueNumber}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{entry.patientName ?? '—'}</p>
        <p className="text-xs text-muted-foreground">
          {entry.channel === 'PHONE' ? <PhoneCall className="mr-1 inline h-3 w-3" /> : <PersonStanding className="mr-1 inline h-3 w-3" />}
          Booked {formatRelativeTime(entry.bookedAt)}
          {entry.requeueCount > 0 && <span className="ml-2 text-amber-600">(re-queued {entry.requeueCount}×)</span>}
        </p>
        {entry.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{entry.notes}</p>}
        {entry.skipReason && <p className="mt-0.5 text-xs text-amber-700">Skip: {entry.skipReason}</p>}
        {entry.cancelReason && <p className="mt-0.5 text-xs text-red-700">Cancel: {entry.cancelReason}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        {entry.status === 'WAITING' && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => callQueueEntry(entry.id))} aria-label="Call patient">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => cancelBooking(entry.id, { reason: 'Cancelled by staff' }))} aria-label="Cancel booking">
              <X className="h-3 w-3" />
            </Button>
          </>
        )}
        {entry.status === 'SERVING' && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => completeQueueEntry(entry.id))} aria-label="Complete">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => skipQueueEntry(entry.id, {}))} aria-label="Skip">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <SkipForward className="h-3 w-3" />}
            </Button>
          </>
        )}
        {entry.status === 'SKIPPED' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => requeueQueueEntry(entry.id))} aria-label="Re-queue">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export function QueueSessionDetail({ queueSessionId }: QueueSessionDetailProps) {
  const queryClient = useQueryClient();
  const etagRef = useRef<string | undefined>(undefined);

  const [callingNext, setCallingNext] = useState(false);
  const [sessionAction, setSessionAction] = useState<'open' | 'close' | null>(null);
  const [sessionActionBusy, setSessionActionBusy] = useState(false);
  const [forceClose, setForceClose] = useState(false);
  const [stateConflict, setStateConflict] = useState<string | null>(null);

  const { data: session, isLoading, error, isError } = useQuery<QueueSessionResponse | null>({
    queryKey: queryKeys.queueSessions.detail(queueSessionId),
    queryFn: async () => {
      const result = await getQueueSession(queueSessionId, etagRef.current);
      if ('notModified' in result) return null;
      etagRef.current = result.etag;
      return result.data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => (query.state.data?.status === 'OPEN' ? 10_000 : 30_000),
    placeholderData: (prev) => prev,
  });

  const { data: entriesData, refetch: refetchEntries } = useQuery({
    queryKey: queryKeys.queueSessions.entries(queueSessionId),
    queryFn: () => listQueueEntries(queueSessionId, { size: 100 }),
    staleTime: 10_000,
    refetchInterval: session?.status === 'OPEN' ? 15_000 : false,
    enabled: !!session,
  });

  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.detail(queueSessionId) }),
      refetchEntries(),
    ]);
  }, [queryClient, queueSessionId, refetchEntries]);

  const handleCallNext = useCallback(async () => {
    if (!session) return;
    setCallingNext(true);
    setStateConflict(null);
    try {
      const result = await callNextPatient(queueSessionId, {
        expectedLastCalledNumber: session.currentServingNumber ?? null,
      });
      if (result.calledEntry) {
        toast.success(`Now calling #${result.calledEntry.queueNumber}`);
      } else {
        toast.info('No patients waiting.');
      }
      await refetchAll();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'QUEUE_STATE_CHANGED') {
        const newNum = err.extra['currentServingNumber'];
        setStateConflict(
          `Queue changed — now serving #${newNum ?? '?'}. Please try again.`,
        );
        await refetchAll();
      } else {
        toast.error(err instanceof ApiError ? err.title : 'Failed to call next.');
      }
    } finally {
      setCallingNext(false);
    }
  }, [session, queueSessionId, refetchAll]);

  const handleSessionAction = useCallback(async () => {
    if (!session) return;
    setSessionActionBusy(true);
    try {
      if (sessionAction === 'open') {
        await openQueueSession(queueSessionId);
        toast.success('Session opened.');
      } else if (sessionAction === 'close') {
        try {
          await closeQueueSession(queueSessionId, { force: forceClose });
          toast.success('Session closed.');
        } catch (err) {
          if (
            err instanceof ApiError &&
            err.code === 'QUEUE_SESSION_HAS_ACTIVE_ENTRIES' &&
            !forceClose
          ) {
            const waiting = Number(err.extra['waitingCount'] ?? 0);
            const serving = Number(err.extra['servingCount'] ?? 0);
            toast.error(
              `Cannot close: ${waiting} waiting, ${serving} serving. Use force close to proceed.`,
              { duration: 6000 },
            );
            setForceClose(true);
            setSessionActionBusy(false);
            return;
          }
          throw err;
        }
      }
      setSessionAction(null);
      setForceClose(false);
      await refetchAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.title : 'Action failed.');
    } finally {
      setSessionActionBusy(false);
    }
  }, [session, sessionAction, queueSessionId, forceClose, refetchAll]);

  if (isLoading && !session) return <LoadingSkeleton variant="page" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!session) return null;

  const entries = entriesData?.items ?? [];
  const waiting = entries.filter((e) => e.status === 'WAITING');
  const serving = entries.filter((e) => e.status === 'SERVING');
  const completed = entries.filter((e) => e.status === 'COMPLETED' || e.status === 'SKIPPED' || e.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/queue" className="mt-1 text-muted-foreground hover:text-foreground" aria-label="Back to sessions">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <StatusBadge status={session.status} showPulse={session.status === 'OPEN'} />
          </div>
          <p className="text-sm text-muted-foreground">
            {session.sessionDate}
            {session.assignedDoctor && ` · Dr. ${session.assignedDoctor.fullName}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {session.status === 'SCHEDULED' && (
            <Button onClick={() => setSessionAction('open')} variant="default">
              Open session
            </Button>
          )}
          {session.status === 'OPEN' && (
            <Button onClick={() => setSessionAction('close')} variant="outline">
              Close session
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {([
          ['Waiting', session.counts.waiting],
          ['Serving', session.counts.serving],
          ['Completed', session.counts.completed],
          ['Skipped', session.counts.skipped],
          ['Cancelled', session.counts.cancelled],
        ] as [string, number][]).map(([label, count]) => (
          <div key={label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Currently serving */}
      {session.servingEntries.length > 0 && (
        <div className="rounded-lg border bg-amber-50 px-4 py-3 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Currently serving</p>
          <div className="flex flex-wrap gap-2">
            {session.servingEntries.map((s) => (
              <Badge key={s.id} variant="outline" className="text-base font-bold">
                #{s.queueNumber} {s.patientName && `· ${s.patientName}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Call next */}
      {session.status === 'OPEN' && (
        <div className="space-y-2">
          {stateConflict && (
            <p className="text-sm text-amber-700" role="alert">{stateConflict}</p>
          )}
          <Button
            size="lg"
            disabled={callingNext || session.counts.waiting === 0}
            onClick={handleCallNext}
            className="w-full sm:w-auto"
          >
            {callingNext && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Call next
            {session.nextWaitingNumber !== null && session.nextWaitingNumber !== undefined && (
              <span className="ml-2 opacity-70">→ #{session.nextWaitingNumber}</span>
            )}
          </Button>
        </div>
      )}

      {/* Entry tabs */}
      <Tabs defaultValue="waiting">
        <TabsList>
          <TabsTrigger value="waiting">
            Waiting <span className="ml-1 text-xs">({waiting.length})</span>
          </TabsTrigger>
          <TabsTrigger value="serving">
            Serving <span className="ml-1 text-xs">({serving.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            History <span className="ml-1 text-xs">({completed.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="space-y-2 mt-4">
          {waiting.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No patients waiting.</p>
          ) : (
            waiting.map((e) => <EntryRow key={e.id} entry={e} onAction={refetchAll} />)
          )}
        </TabsContent>

        <TabsContent value="serving" className="space-y-2 mt-4">
          {serving.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nobody being served.</p>
          ) : (
            serving.map((e) => <EntryRow key={e.id} entry={e} onAction={refetchAll} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          {completed.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>
          ) : (
            completed.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 opacity-70">
                <span className="text-xl font-bold tabular-nums shrink-0">#{e.queueNumber}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{e.patientName ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.completedAt ?? e.skippedAt ?? e.cancelledAt)}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Session open/close confirm */}
      <ConfirmDialog
        open={sessionAction !== null}
        onOpenChange={(o) => { if (!o) { setSessionAction(null); setForceClose(false); } }}
        title={sessionAction === 'open' ? 'Open session?' : forceClose ? 'Force close session?' : 'Close session?'}
        description={
          sessionAction === 'close' && forceClose
            ? `There are active entries in the queue. Force closing will leave them unserved. Continue?`
            : sessionAction === 'open'
            ? 'This will allow bookings and queue management.'
            : 'This will stop accepting new bookings.'
        }
        confirmLabel={forceClose ? 'Force close' : sessionAction === 'open' ? 'Open' : 'Close'}
        destructive={forceClose}
        loading={sessionActionBusy}
        onConfirm={handleSessionAction}
      />
    </div>
  );
}
