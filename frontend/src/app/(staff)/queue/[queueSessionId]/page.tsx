import { RequireAuth } from '@/features/auth/RequireAuth';
import { QueueSessionDetail } from '@/features/queue/QueueSessionDetail';

export default async function Page({ params }: { params: Promise<{ queueSessionId: string }> }) {
  const { queueSessionId } = await params;
  return (
    <RequireAuth>
      <QueueSessionDetail queueSessionId={queueSessionId} />
    </RequireAuth>
  );
}
