'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAuditEvents } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import type { AuditEventResponse, AuditOutcome } from '@/lib/api/types';

const AUDIT_ACTIONS = [
  'LOGIN', 'LOGOUT', 'TOKEN_REFRESH',
  'CREATE_PATIENT', 'UPDATE_PATIENT',
  'CREATE_CONSULTATION', 'CREATE_PRESCRIPTION',
  'START_PRESCRIPTION', 'DISPENSE_PRESCRIPTION', 'CANCEL_PRESCRIPTION',
  'CREATE_MEDICINE', 'UPDATE_MEDICINE',
  'CREATE_USER', 'UPDATE_USER', 'RESET_PASSWORD', 'CHANGE_PASSWORD',
  'CREATE_QUEUE_SESSION', 'OPEN_QUEUE_SESSION', 'CLOSE_QUEUE_SESSION',
  'CREATE_BOOKING', 'CALL_NEXT', 'CALL_ENTRY', 'COMPLETE_ENTRY', 'SKIP_ENTRY',
];

function outcomeBadge(outcome: AuditOutcome) {
  if (outcome === 'SUCCESS') return <Badge variant="outline" className="text-green-700 border-green-300">Success</Badge>;
  if (outcome === 'DENIED') return <Badge variant="outline" className="text-amber-700 border-amber-300">Denied</Badge>;
  return <Badge variant="destructive">Failure</Badge>;
}

function EventRow({ event }: { event: AuditEventResponse }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(event.occurredAt)}
      </td>
      <td className="px-3 py-2.5 text-sm">
        {event.actor?.username ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs">{event.action}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{event.entityType}</td>
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
        {event.entityId ? event.entityId.slice(0, 8) + '…' : '—'}
      </td>
      <td className="px-3 py-2.5">{outcomeBadge(event.outcome)}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {event.ipAddress ?? '—'}
      </td>
    </tr>
  );
}

export function AuditEventList() {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    action: '',
    entityType: '',
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.auditEvents({ ...applied, page }),
    queryFn: () =>
      listAuditEvents({
        from: applied.from || undefined,
        to: applied.to || undefined,
        action: applied.action || undefined,
        entityType: applied.entityType || undefined,
        page,
        size: 20,
      }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(filters);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleApply} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="audit-from" className="text-xs">From</Label>
          <Input
            id="audit-from"
            type="datetime-local"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-auto text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-to" className="text-xs">To</Label>
          <Input
            id="audit-to"
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-auto text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select
            value={filters.action}
            onValueChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a} className="text-xs font-mono">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-entity" className="text-xs">Entity type</Label>
          <Input
            id="audit-entity"
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            placeholder="e.g. Patient"
            className="w-[140px] text-xs h-8"
          />
        </div>
        <Button type="submit" size="sm">Apply</Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => { setFilters({ from: '', to: '', action: '', entityType: '' }); setApplied({ from: '', to: '', action: '', entityType: '' }); setPage(0); }}
        >
          Clear
        </Button>
      </form>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">Time</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">Actor</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">Action</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">Entity</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">ID</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">Outcome</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  data.items.map((e) => <EventRow key={e.id} event={e} />)
                )}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {data.totalPages} · {data.totalItems} events
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
