import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, breadcrumb, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-1 text-sm text-muted-foreground">
            {breadcrumb}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
