import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicineList } from '@/features/medicines/MedicineList';
import { renderWithProviders } from './utils/render';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Admin', roles: ['ADMIN'], mustChangePassword: false },
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

describe('FT-16: MedicineList', () => {
  it('shows medicine name', async () => {
    renderWithProviders(<MedicineList />);
    expect(await screen.findByText('Paracetamol')).toBeInTheDocument();
  });

  it('shows medicine strength', async () => {
    renderWithProviders(<MedicineList />);
    expect(await screen.findByText(/500mg/i)).toBeInTheDocument();
  });

  it('shows dosage form', async () => {
    renderWithProviders(<MedicineList />);
    expect(await screen.findByText(/tablet/i)).toBeInTheDocument();
  });

  it('renders search input', async () => {
    renderWithProviders(<MedicineList />);
    expect(await screen.findByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('opens new medicine dialog on button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MedicineList />);
    await screen.findByText('Paracetamol');
    await user.click(screen.getByRole('button', { name: /new medicine/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows active badge for active medicine', async () => {
    renderWithProviders(<MedicineList />);
    expect(await screen.findByText(/active/i)).toBeInTheDocument();
  });
});
