import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#1F5F8B] text-white',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        pending: 'border-amber-300 bg-amber-100 text-amber-800',
        inProgress: 'border-blue-300 bg-blue-100 text-blue-800',
        dispensed: 'border-green-300 bg-green-100 text-green-800',
        dispensedPartial: 'border-green-300 bg-white text-green-800',
        cancelled: 'border-gray-300 bg-gray-100 text-gray-600',
        waiting: 'border-gray-300 bg-gray-100 text-gray-700',
        serving: 'border-blue-300 bg-blue-100 text-blue-800',
        completed: 'border-green-300 bg-green-100 text-green-800',
        skipped: 'border-amber-300 bg-amber-100 text-amber-800',
        scheduled: 'border-slate-300 bg-slate-100 text-slate-700',
        open: 'border-green-300 bg-green-100 text-green-800',
        closed: 'border-gray-300 bg-gray-100 text-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
