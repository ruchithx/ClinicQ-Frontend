import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, toUserMessage } from '@/lib/api/problem';
import { cn } from '@/lib/utils';

interface ErrorPanelProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  screenOverrides?: Record<string, string>;
}

export function ErrorPanel({ error, onRetry, className, screenOverrides }: ErrorPanelProps) {
  const message = toUserMessage(error, screenOverrides as Parameters<typeof toUserMessage>[1]);
  const requestId =
    error instanceof ApiError && (error.status >= 500 || error.status === 0)
      ? error.requestId
      : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">{message}</p>
        {requestId && (
          <p className="text-xs text-muted-foreground">Reference: {requestId}</p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
