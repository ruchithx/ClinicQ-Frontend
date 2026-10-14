import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '@/features/bookings/BookingForm';
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

describe('FT-08: BookingForm', () => {
  it('renders patient name field', async () => {
    renderWithProviders(<BookingForm />);
    expect(await screen.findByLabelText(/caller name|patient name/i)).toBeInTheDocument();
  });

  it('renders channel selector', async () => {
    renderWithProviders(<BookingForm />);
    // channel radio group
    expect(await screen.findByLabelText(/walk.in/i)).toBeInTheDocument();
  });

  it('renders session selector with open sessions', async () => {
    renderWithProviders(<BookingForm />);
    expect(await screen.findByText(/morning clinic/i)).toBeInTheDocument();
  });

  it('has create booking submit button', async () => {
    renderWithProviders(<BookingForm />);
    expect(await screen.findByRole('button', { name: /add to queue/i })).toBeInTheDocument();
  });

  it('shows error when submitting without a session selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingForm />);
    await screen.findByRole('button', { name: /add to queue/i });
    await user.type(screen.getByLabelText(/patient name/i), 'Alice Smith');
    await user.click(screen.getByRole('button', { name: /add to queue/i }));
    expect(await screen.findByText(/please select a queue session/i)).toBeInTheDocument();
  });
});
