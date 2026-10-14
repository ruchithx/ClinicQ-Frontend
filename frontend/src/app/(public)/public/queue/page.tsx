import type { Metadata } from 'next';
import { PublicSessionList } from '@/features/queue/PublicSessionList';

export const metadata: Metadata = { title: 'Queue Status' };

export default function PublicQueuePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Today&apos;s Queues</h1>
      <PublicSessionList />
    </div>
  );
}
