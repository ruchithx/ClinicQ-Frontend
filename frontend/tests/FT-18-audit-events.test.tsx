import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { AuditEventList } from '@/features/admin/AuditEventList';
import { renderWithProviders } from './utils/render';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'a1', fullName: 'Admin User', roles: ['ADMIN'], mustChangePassword: false },
    login: vi.fn(), logout: vi.fn(), hasRole: (r: string) => r === 'ADMIN', hasAnyRole: (rs: string[]) => rs.includes('ADMIN'),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-18: AuditEventList', () => {
  it('shows audit event action', async () => {
    renderWithProviders(<AuditEventList />);
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
  });

  it('shows actor username', async () => {
    renderWithProviders(<AuditEventList />);
    expect(await screen.findByText('doctor1')).toBeInTheDocument();
  });

  it('shows entity type', async () => {
    renderWithProviders(<AuditEventList />);
    expect(await screen.findByText('User')).toBeInTheDocument();
  });

  it('shows outcome badge', async () => {
    renderWithProviders(<AuditEventList />);
    expect(await screen.findByText(/success/i)).toBeInTheDocument();
  });

  it('renders date filter inputs', async () => {
    renderWithProviders(<AuditEventList />);
    // The list renders with filters; wait for data then check filters
    await screen.findByText('LOGIN');
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
  });

  it('renders action filter dropdown', async () => {
    renderWithProviders(<AuditEventList />);
    await screen.findByText('LOGIN');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
