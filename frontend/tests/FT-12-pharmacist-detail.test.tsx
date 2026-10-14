import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { PharmacistPrescriptionDetail } from '@/features/pharmacy/PharmacistPrescriptionDetail';
import { renderWithProviders } from './utils/render';
import { MOCK_PRESCRIPTION_ID } from './mocks/handlers';

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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('FT-12: PharmacistPrescriptionDetail', () => {
  it('shows prescription number', async () => {
    renderWithProviders(<PharmacistPrescriptionDetail prescriptionId={MOCK_PRESCRIPTION_ID} />);
    expect(await screen.findByText(/RX-000001/)).toBeInTheDocument();
  });

  it('shows patient name and allergy warning', async () => {
    renderWithProviders(<PharmacistPrescriptionDetail prescriptionId={MOCK_PRESCRIPTION_ID} />);
    expect(await screen.findByText(/john patient/i)).toBeInTheDocument();
    expect(await screen.findByText(/penicillin/i)).toBeInTheDocument();
  });

  it('shows Start dispensing button for PENDING prescription', async () => {
    renderWithProviders(<PharmacistPrescriptionDetail prescriptionId={MOCK_PRESCRIPTION_ID} />);
    expect(await screen.findByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('shows prescription items', async () => {
    renderWithProviders(<PharmacistPrescriptionDetail prescriptionId={MOCK_PRESCRIPTION_ID} />);
    expect(await screen.findByText(/paracetamol/i)).toBeInTheDocument();
  });

  it('handles INVALID_STATUS_TRANSITION error', async () => {
    server.use(
      http.post(`/api/v1/prescriptions/${MOCK_PRESCRIPTION_ID}/start`, () =>
        HttpResponse.json({
          code: 'INVALID_STATUS_TRANSITION',
          title: 'Invalid status transition',
          detail: 'Already dispensed',
          errors: [],
          requestId: 'req-1',
          currentStatus: 'DISPENSED',
        }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<PharmacistPrescriptionDetail prescriptionId={MOCK_PRESCRIPTION_ID} />);
    const startBtn = await screen.findByRole('button', { name: /start/i });
    await user.click(startBtn);
    expect(await screen.findByText(/status/i)).toBeInTheDocument();
  });
});
