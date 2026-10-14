import { RequireAuth } from '@/features/auth/RequireAuth';
import { PageHeader } from '@/components/PageHeader';
import { QueueSessionList } from '@/features/queue/QueueSessionList';

export default function Page() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <PageHeader title="Queue sessions" />
        <QueueSessionList />
      </div>
    </RequireAuth>
  );
}
