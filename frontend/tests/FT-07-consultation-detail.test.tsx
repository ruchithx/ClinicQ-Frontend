import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ConsultationDetail } from '@/features/consultations/ConsultationDetail';
import { renderWithProviders } from './utils/render';
import { MOCK_CONSULTATION_ID } from './mocks/handlers';

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

describe('FT-07: ConsultationDetail', () => {
  it('shows presenting complaint', async () => {
    renderWithProviders(<ConsultationDetail consultationId={MOCK_CONSULTATION_ID} />);
    expect(await screen.findByText(/headache and fever/i)).toBeInTheDocument();
  });

  it('shows patient name', async () => {
    renderWithProviders(<ConsultationDetail consultationId={MOCK_CONSULTATION_ID} />);
    const matches = await screen.findAllByText(/john patient/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows diagnosis', async () => {
    renderWithProviders(<ConsultationDetail consultationId={MOCK_CONSULTATION_ID} />);
    expect(await screen.findByText(/viral fever/i)).toBeInTheDocument();
  });

  it('shows prescription number', async () => {
    renderWithProviders(<ConsultationDetail consultationId={MOCK_CONSULTATION_ID} />);
    expect(await screen.findByText(/RX-000001/)).toBeInTheDocument();
  });

  it('shows prescription item', async () => {
    renderWithProviders(<ConsultationDetail consultationId={MOCK_CONSULTATION_ID} />);
    expect(await screen.findByText(/paracetamol/i)).toBeInTheDocument();
  });
});
