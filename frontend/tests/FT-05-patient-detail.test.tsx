import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PatientDetail } from '@/features/patients/PatientDetail';
import { renderWithProviders } from './utils/render';
import { MOCK_PATIENT_ID } from './mocks/handlers';

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

describe('FT-05: PatientDetail', () => {
  it('shows patient name', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText('John Patient')).toBeInTheDocument();
  });

  it('shows patient number', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText('P-001')).toBeInTheDocument();
  });

  it('shows allergy warning when patient has allergies', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText(/penicillin/i)).toBeInTheDocument();
  });

  it('shows conditions from medical history', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText(/hypertension/i)).toBeInTheDocument();
  });

  it('shows consultation history', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText(/headache and fever/i)).toBeInTheDocument();
  });

  it('shows new consultation button', async () => {
    renderWithProviders(<PatientDetail patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByRole('button', { name: /new consultation/i })).toBeInTheDocument();
  });
});
