import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DispenseForm } from '@/features/pharmacy/DispenseForm';
import { renderWithProviders } from './utils/render';
import { MOCK_PRESCRIPTION } from './mocks/handlers';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: '00000000-0000-0000-0000-000000000002', fullName: 'Pharma User', roles: ['PHARMACIST'], mustChangePassword: false },
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

describe('FT-13: DispenseForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  it('renders item rows with medicine names', () => {
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    expect(screen.getByText(/paracetamol/i)).toBeInTheDocument();
  });

  it('shows allergy warning when patient has allergies', () => {
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    expect(screen.getByText(/penicillin/i)).toBeInTheDocument();
  });

  it('renders confirmation checkbox', () => {
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    expect(screen.getByLabelText(/handed|confirm/i)).toBeInTheDocument();
  });

  it('shows default dispensed quantity from prescription', () => {
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(15);
  });

  it('requires confirmation checkbox before submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: /confirm dispense/i }));
    // Should not call onSuccess without confirmation
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('submits successfully when confirmation is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DispenseForm prescription={MOCK_PRESCRIPTION} onSuccess={onSuccess} onCancel={onCancel} />,
    );
    await user.click(screen.getByLabelText(/handed|confirm/i));
    await user.click(screen.getByRole('button', { name: /confirm dispense/i }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
