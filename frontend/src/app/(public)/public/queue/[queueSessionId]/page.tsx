import type { Metadata } from 'next';
import { PublicQueueDisplay } from '@/features/queue/PublicQueueDisplay';

export const metadata: Metadata = { title: 'Queue Display' };

interface Props {
  params: Promise<{ queueSessionId: string }>;
}

export default async function PublicQueueStatusPage({ params }: Props) {
  const { queueSessionId } = await params;
  return <PublicQueueDisplay queueSessionId={queueSessionId} />;
}
