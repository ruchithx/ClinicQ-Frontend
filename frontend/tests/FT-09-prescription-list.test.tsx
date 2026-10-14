import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PrescriptionList } from '@/features/prescriptions/PrescriptionList';
import { renderWithProviders } from './utils/render';
import { MOCK_USER_ID } from './mocks/handlers';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: MOCK_USER_ID, fullName: 'Dr Jane', roles: ['DOCTOR'], mustChangePassword: false },
    login: vi.fn(), logout: vi.fn(), hasRole: () => true, hasAnyRole: () => true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-09: PrescriptionList', () => {
  it('shows prescription number', async () => {
    renderWithProviders(<PrescriptionList />);
    expect(await screen.findByText('RX-000001')).toBeInTheDocument();
  });

  it('shows patient name', async () => {
    renderWithProviders(<PrescriptionList />);
    expect(await screen.findByText(/john patient/i)).toBeInTheDocument();
  });

  it('shows status badge for PENDING', async () => {
    renderWithProviders(<PrescriptionList />);
    expect(await screen.findByText(/pending/i)).toBeInTheDocument();
  });

  it('renders links with correct href base', async () => {
    renderWithProviders(<PrescriptionList linkBase="/doctor/consultations" />);
    const link = await screen.findByRole('link');
    expect((link as HTMLAnchorElement).href).toContain('/doctor/consultations/');
  });
});
