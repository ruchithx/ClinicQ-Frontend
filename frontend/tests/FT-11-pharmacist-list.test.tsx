import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PharmacistPrescriptionList } from '@/features/pharmacy/PharmacistPrescriptionList';
import { renderWithProviders } from './utils/render';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: '00000000-0000-0000-0000-000000000002', fullName: 'Pharma User', roles: ['PHARMACIST'], mustChangePassword: false },
    login: vi.fn(), logout: vi.fn(), hasRole: (r: string) => r === 'PHARMACIST', hasAnyRole: (rs: string[]) => rs.includes('PHARMACIST'),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-11: PharmacistPrescriptionList', () => {
  it('shows prescription number', async () => {
    renderWithProviders(<PharmacistPrescriptionList />);
    expect(await screen.findByText('RX-000001')).toBeInTheDocument();
  });

  it('shows patient name', async () => {
    renderWithProviders(<PharmacistPrescriptionList />);
    expect(await screen.findByText(/john patient/i)).toBeInTheDocument();
  });

  it('shows tab labels', async () => {
    renderWithProviders(<PharmacistPrescriptionList />);
    expect(await screen.findByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/dispensed/i)).toBeInTheDocument();
    expect(screen.getByText(/^all$/i)).toBeInTheDocument();
  });

  it('switches to all tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PharmacistPrescriptionList />);
    await screen.findByText('RX-000001');
    await user.click(screen.getByRole('tab', { name: /^all$/i }));
    // Still shows prescriptions
    expect(screen.getByText('RX-000001')).toBeInTheDocument();
  });
});
