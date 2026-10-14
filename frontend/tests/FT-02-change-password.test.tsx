import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { renderWithProviders } from './utils/render';

const mockBack = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', username: 'doctor1', fullName: 'Dr Jane', roles: ['DOCTOR'], mustChangePassword: false },
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: () => true,
    hasAnyRole: () => true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: mockBack }),
  usePathname: () => '/change-password',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('FT-02: ChangePasswordForm', () => {
  it('renders three password fields', () => {
    renderWithProviders(<ChangePasswordForm />);
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);
    await user.type(screen.getByLabelText(/current password/i), 'OldPass123!');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123456!');
    await user.type(screen.getByLabelText(/confirm/i), 'DifferentPass!');
    await user.click(screen.getByRole('button', { name: /change password/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('calls change-password API on valid submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);
    await user.type(screen.getByLabelText(/current password/i), 'OldPass123!');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123!');
    await user.type(screen.getByLabelText(/confirm/i), 'NewSecurePass123!');
    await user.click(screen.getByRole('button', { name: /change password/i }));
    // MSW handles the POST and returns 204; success toast should fire
    const { toast } = await import('sonner');
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
