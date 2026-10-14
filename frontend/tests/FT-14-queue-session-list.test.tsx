import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueSessionList } from '@/features/queue/QueueSessionList';
import { renderWithProviders } from './utils/render';

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

describe('FT-14: QueueSessionList', () => {
  it('shows session name', async () => {
    renderWithProviders(<QueueSessionList />);
    expect(await screen.findByText('Morning Clinic')).toBeInTheDocument();
  });

  it('shows session status', async () => {
    renderWithProviders(<QueueSessionList />);
    expect(await screen.findByText(/open/i)).toBeInTheDocument();
  });

  it('shows waiting count', async () => {
    renderWithProviders(<QueueSessionList />);
    expect(await screen.findByText(/2 waiting/i)).toBeInTheDocument();
  });

  it('shows create session button', async () => {
    renderWithProviders(<QueueSessionList />);
    expect(await screen.findByRole('button', { name: /new session/i })).toBeInTheDocument();
  });

  it('opens create session dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QueueSessionList />);
    const createBtn = await screen.findByRole('button', { name: /new session/i });
    await user.click(createBtn);
    expect(await screen.findByText(/session name/i)).toBeInTheDocument();
  });

  it('shows assigned doctor name', async () => {
    renderWithProviders(<QueueSessionList />);
    expect(await screen.findByText(/Dr. Dr Jane Smith/i)).toBeInTheDocument();
  });
});
