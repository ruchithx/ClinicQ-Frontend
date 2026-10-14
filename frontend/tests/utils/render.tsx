import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactNode): RenderResult {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

interface MockUser {
  id: string;
  username: string;
  fullName: string;
  roles: string[];
  mustChangePassword: boolean;
}

interface AuthContextShape {
  status: 'authenticated' | 'anonymous' | 'loading';
  user: MockUser | null;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

// Re-export vi for convenience so render.tsx can call vi.fn()
import { vi } from 'vitest';

export function makeAuthContext(overrides?: Partial<MockUser>): AuthContextShape {
  const user: MockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'doctor1',
    fullName: 'Dr Jane Smith',
    roles: ['DOCTOR'],
    mustChangePassword: false,
    ...overrides,
  };
  return {
    status: 'authenticated',
    user,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: (r: string) => user.roles.includes(r),
    hasAnyRole: (rs: string[]) => rs.some((r) => user.roles.includes(r)),
  };
}

export function renderAuthenticated(
  ui: ReactNode,
  userOverrides?: Partial<MockUser>,
): RenderResult {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  // Note: auth context is mocked per-test via vi.mock('@/features/auth/auth-context', ...)
  // This helper provides the QueryClient wrapper; call makeAuthContext() to get the mock value.
  void userOverrides;
}
