import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { QueueSessionDetail } from '@/features/queue/QueueSessionDetail';
import { renderWithProviders } from './utils/render';
import { MOCK_QUEUE_SESSION_ID } from './mocks/handlers';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dr Jane', roles: ['DOCTOR'], mustChangePassword: false },
    login: vi.fn(), logout: vi.fn(), hasRole: () => true, hasAnyRole: () => true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('FT-15: QueueSessionDetail', () => {
  it('shows session name', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText('Morning Clinic')).toBeInTheDocument();
  });

  it('shows session status badge', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText(/open/i)).toBeInTheDocument();
  });

  it('shows counts', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    // Multiple elements contain "2"; verify at least one is present
    const matches = await screen.findAllByText(/^2$/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows call next button when OPEN', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByRole('button', { name: /call next/i })).toBeInTheDocument();
  });

  it('shows currently serving entry', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText(/john patient/i)).toBeInTheDocument();
  });

  it('shows waiting entry in entries list', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByText(/alice booking/i)).toBeInTheDocument();
  });

  it('shows close session button', async () => {
    renderWithProviders(<QueueSessionDetail queueSessionId={MOCK_QUEUE_SESSION_ID} />);
    expect(await screen.findByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});
