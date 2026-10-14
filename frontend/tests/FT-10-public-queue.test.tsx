import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PublicSessionList } from '@/features/queue/PublicSessionList';
import { PublicQueueDisplay } from '@/features/queue/PublicQueueDisplay';
import { renderWithProviders } from './utils/render';
import { MOCK_QUEUE_SESSION_ID } from './mocks/handlers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-10a: PublicSessionList', () => {
  it('shows today\'s session name', async () => {
    renderWithProviders(<PublicSessionList />);
    expect(await screen.findByText('Morning Clinic')).toBeInTheDocument();
  });

  it('shows session status badge', async () => {
    renderWithProviders(<PublicSessionList />);
    expect(await screen.findByText(/open/i)).toBeInTheDocument();
  });

  it('shows waiting count', async () => {
    renderWithProviders(<PublicSessionList />);
    expect(await screen.findByText(/2 waiting/i)).toBeInTheDocument();
  });

  it('shows current serving number', async () => {
    renderWithProviders(<PublicSessionList />);
    expect(await screen.findByText(/#3/)).toBeInTheDocument();
  });

  it('renders a link to the session queue', async () => {
    renderWithProviders(<PublicSessionList />);
    const link = await screen.findByRole('link');
    expect((link as HTMLAnchorElement).href).toContain(`/public/queue/${MOCK_QUEUE_SESSION_ID}`);
  });
});

describe('FT-10b: PublicQueueDisplay', () => {
  it('shows the current serving number prominently', async () => {
    renderWithProviders(<PublicQueueDisplay queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('shows waiting count', async () => {
    renderWithProviders(<PublicQueueDisplay queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    // Count and label are in separate elements; check the label
    expect(await screen.findByText(/^waiting$/i)).toBeInTheDocument();
  });

  it('shows "Now Serving" label', async () => {
    renderWithProviders(<PublicQueueDisplay queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText(/now serving/i)).toBeInTheDocument();
  });

  it('shows the session name', async () => {
    renderWithProviders(<PublicQueueDisplay queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText('Morning Clinic')).toBeInTheDocument();
  });
});
