import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewConsultationForm } from '@/features/consultations/NewConsultationForm';
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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('FT-06: NewConsultationForm', () => {
  it('shows patient info after load', async () => {
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    expect(await screen.findByText(/john patient/i)).toBeInTheDocument();
  });

  it('renders presenting complaint textarea', async () => {
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    await screen.findByText(/john patient/i);
    expect(screen.getByLabelText(/presenting complaint/i)).toBeInTheDocument();
  });

  it('renders diagnosis field', async () => {
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    await screen.findByText(/john patient/i);
    expect(screen.getByPlaceholderText(/condition or diagnosis/i)).toBeInTheDocument();
  });

  it('can add another diagnosis', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    await screen.findByText(/john patient/i);
    await user.click(screen.getByRole('button', { name: /add diagnosis/i }));
    const fields = screen.getAllByPlaceholderText(/condition or diagnosis/i);
    expect(fields.length).toBeGreaterThan(1);
  });

  it('shows prescription section when checkbox is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    await screen.findByText(/john patient/i);
    await user.click(screen.getByLabelText(/include prescription/i));
    expect(await screen.findByRole('heading', { name: /^prescription$/i })).toBeInTheDocument();
  });

  it('has save and cancel buttons', async () => {
    renderWithProviders(<NewConsultationForm patientId={MOCK_PATIENT_ID} />);
    await screen.findByText(/john patient/i);
    expect(screen.getByRole('button', { name: /save consultation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
