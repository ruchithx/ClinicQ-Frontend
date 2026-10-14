import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/features/auth/LoginForm';
import { renderWithProviders } from './utils/render';

const mockLogin = vi.fn();
const mockReplace = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'anonymous',
    user: null,
    login: mockLogin,
    logout: vi.fn(),
    hasRole: () => false,
    hasAnyRole: () => false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn() }),
  usePathname: () => '/login',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FT-01: LoginForm', () => {
  it('renders username and password fields', () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/username/i), 'doctor1');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    mockLogin.mockReset();
  });

  it('shows error message on login failure', async () => {
    const { ApiError } = await import('@/lib/api/problem');
    mockLogin.mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials', '', [], null, {}),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/username/i), 'wronguser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows session expired message when reason=expired', () => {
    renderWithProviders(<LoginForm reason="expired" />);
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
  });

  it('redirects after successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    mockReplace.mockClear();
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText(/username/i), 'doctor1');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await vi.waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });
});
