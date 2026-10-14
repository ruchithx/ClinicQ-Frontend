import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from '@/features/admin/UserList';
import { UserDetail } from '@/features/admin/UserDetail';
import { renderWithProviders } from './utils/render';
import { MOCK_USER_ID } from './mocks/handlers';

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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('FT-17a: UserList', () => {
  it('shows user full name', async () => {
    renderWithProviders(<UserList />);
    expect(await screen.findByText('Dr Jane Smith')).toBeInTheDocument();
  });

  it('shows username', async () => {
    renderWithProviders(<UserList />);
    expect(await screen.findByText('doctor1')).toBeInTheDocument();
  });

  it('shows role badge', async () => {
    renderWithProviders(<UserList />);
    expect(await screen.findByText('Doctor')).toBeInTheDocument();
  });

  it('shows create user button', async () => {
    renderWithProviders(<UserList />);
    expect(await screen.findByRole('button', { name: /new user/i })).toBeInTheDocument();
  });

  it('opens create user dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserList />);
    const createBtn = await screen.findByRole('button', { name: /new user/i });
    await user.click(createBtn);
    expect(await screen.findByLabelText(/username/i)).toBeInTheDocument();
  });

  it('shows search input', async () => {
    renderWithProviders(<UserList />);
    expect(await screen.findByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

describe('FT-17b: UserDetail', () => {
  it('shows user full name', async () => {
    renderWithProviders(<UserDetail userId={MOCK_USER_ID} />);
    expect(await screen.findByText('Dr Jane Smith')).toBeInTheDocument();
  });

  it('shows username', async () => {
    renderWithProviders(<UserDetail userId={MOCK_USER_ID} />);
    expect(await screen.findByText('doctor1')).toBeInTheDocument();
  });

  it('shows edit form with full name field', async () => {
    renderWithProviders(<UserDetail userId={MOCK_USER_ID} />);
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('shows reset password section', async () => {
    renderWithProviders(<UserDetail userId={MOCK_USER_ID} />);
    const headings = await screen.findAllByText(/reset password/i);
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('has save button for edit form', async () => {
    renderWithProviders(<UserDetail userId={MOCK_USER_ID} />);
    await screen.findByText('Dr Jane Smith');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
