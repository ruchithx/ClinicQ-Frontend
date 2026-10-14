import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientSearchForm } from '@/features/patients/PatientSearchForm';
import { renderWithProviders } from './utils/render';

const mockPush = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dr Jane', roles: ['DOCTOR'], mustChangePassword: false },
    login: vi.fn(), logout: vi.fn(), hasRole: () => true, hasAnyRole: () => true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-03: PatientSearchForm', () => {
  it('renders search input and button', () => {
    renderWithProviders(<PatientSearchForm />);
    expect(screen.getByRole('textbox', { name: /patient search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('shows patient results after search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientSearchForm />);
    await user.type(screen.getByRole('textbox', { name: /patient search/i }), 'John');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(await screen.findByText('John Patient')).toBeInTheDocument();
  });

  it('shows patient number in results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientSearchForm />);
    await user.type(screen.getByRole('textbox', { name: /patient search/i }), 'John');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(await screen.findByText(/P-001/)).toBeInTheDocument();
  });

  it('navigates to patient detail on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatientSearchForm />);
    await user.type(screen.getByRole('textbox', { name: /patient search/i }), 'John');
    await user.click(screen.getByRole('button', { name: /search/i }));
    const result = await screen.findByText('John Patient');
    await user.click(result);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/doctor/patients/'));
  });

  it('has new patient button', () => {
    renderWithProviders(<PatientSearchForm />);
    expect(screen.getByRole('button', { name: /new patient/i })).toBeInTheDocument();
  });
});
