import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PrescriptionStatus, QueueEntryStatus, QueueSessionStatus } from '@/lib/api/types';

type Status =
  | PrescriptionStatus
  | QueueEntryStatus
  | QueueSessionStatus
  | 'DISPENSED_PARTIAL';

const statusConfig: Record<
  Status,
  { label: string; variant: string; className?: string }
> = {
  // Prescription statuses
  PENDING: { label: 'Pending', variant: 'pending' },
  IN_PROGRESS: { label: 'In progress', variant: 'inProgress' },
  DISPENSED: { label: 'Dispensed', variant: 'dispensed' },
  DISPENSED_PARTIAL: { label: 'Dispensed — partial', variant: 'dispensedPartial' },
  CANCELLED: { label: 'Cancelled', variant: 'cancelled', className: 'line-through' },

  // Queue entry statuses
  WAITING: { label: 'Waiting', variant: 'waiting' },
  SERVING: { label: 'Serving', variant: 'serving' },
  COMPLETED: { label: 'Completed', variant: 'completed' },
  SKIPPED: { label: 'Skipped', variant: 'skipped' },

  // Queue session statuses
  SCHEDULED: { label: 'Scheduled', variant: 'scheduled' },
  OPEN: { label: 'Open', variant: 'open' },
  CLOSED: { label: 'Closed', variant: 'closed' },
};

interface StatusBadgeProps {
  status: Status;
  showPulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, showPulse, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' };

  return (
    <Badge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variant={config.variant as any}
      className={cn(config.className, className)}
    >
      {showPulse && status === 'SERVING' && (
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600 serving-pulse"
          aria-hidden="true"
        />
      )}
      {config.label}
    </Badge>
  );
}
