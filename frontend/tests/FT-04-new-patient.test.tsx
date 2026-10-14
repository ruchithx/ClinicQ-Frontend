import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { NewPatientForm } from '@/features/patients/NewPatientForm';
import { renderWithProviders } from './utils/render';
import { MOCK_PATIENT } from './mocks/handlers';

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

describe('FT-04: NewPatientForm', () => {
  it('renders required fields', () => {
    renderWithProviders(<NewPatientForm />);
    expect(screen.getByLabelText(/patient number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register patient/i })).toBeInTheDocument();
  });

  it('shows DOB mode switcher', () => {
    renderWithProviders(<NewPatientForm />);
    expect(screen.getByLabelText(/exact date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estimated age/i)).toBeInTheDocument();
  });

  it('shows estimated age field when switching mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewPatientForm />);
    await user.click(screen.getByLabelText(/estimated age/i));
    expect(screen.getByLabelText(/estimated age \(years\)/i)).toBeInTheDocument();
  });

  it('shows duplicate patient number error from API', async () => {
    server.use(
      http.post('/api/v1/patients', () =>
        HttpResponse.json({
          code: 'DUPLICATE_PATIENT_NUMBER',
          title: 'Duplicate patient number',
          detail: 'Already exists',
          errors: [],
          requestId: 'req-1',
        }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<NewPatientForm />);
    await user.type(screen.getByLabelText(/patient number/i), 'P-001');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    const dateInput = screen.getByLabelText(/date of birth/i);
    await user.type(dateInput, '1985-03-15');
    await user.click(screen.getByRole('button', { name: /register patient/i }));
    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
  });

  it('submits successfully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewPatientForm />);
    await user.type(screen.getByLabelText(/patient number/i), 'P-002');
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    const dateInput = screen.getByLabelText(/date of birth/i);
    await user.type(dateInput, '1990-06-15');
    await user.click(screen.getByRole('button', { name: /register patient/i }));
    const { toast } = await import('sonner');
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining(MOCK_PATIENT.fullName),
    ));
  });
});
