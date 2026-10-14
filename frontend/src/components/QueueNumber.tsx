import { cn } from '@/lib/utils';

interface QueueNumberProps {
  number: number | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-7xl',
  xl: 'queue-number-display',
};

export function QueueNumber({
  number,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: QueueNumberProps) {
  return (
    <span
      className={cn('tabular-nums font-bold leading-none', sizeClasses[size], className)}
      aria-label={ariaLabel ?? (number !== null && number !== undefined ? String(number) : 'None')}
    >
      {number !== null && number !== undefined ? number : '—'}
    </span>
  );
}
