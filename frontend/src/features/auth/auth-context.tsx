'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { tokenStore } from '@/lib/auth/token-store';
import { login as apiLogin, logout as apiLogout, refreshToken } from '@/lib/api/endpoints';
import type { LoginRequest } from '@/lib/api/endpoints';
import { getRoleHome } from '@/lib/auth/roles';
import { ApiError } from '@/lib/api/problem';
import { getQueryClient } from '@/lib/query-client';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  roles: string[];
  mustChangePassword: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BROADCAST_CHANNEL = 'dms-auth';
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  // Ref used by scheduleRefresh to call itself recursively without circular dep
  const scheduleRefreshRef = useRef<() => void>(() => {});

  // clearSession is defined first so scheduleRefresh can safely reference it
  const clearSession = useCallback(() => {
    tokenStore.clear();
    setStatus('anonymous');
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    getQueryClient().clear();
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const stored = tokenStore.get();
    if (!stored) return;
    const delay = stored.expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    if (delay <= 0) return;

    refreshTimerRef.current = setTimeout(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const result = await refreshToken();
        tokenStore.set({
          accessToken: result.accessToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
          user: {
            id: result.user.id,
            username: result.user.username,
            fullName: result.user.fullName,
            roles: result.user.roles,
            mustChangePassword: result.user.mustChangePassword,
          },
        });
        setUser(tokenStore.get()!.user);
        scheduleRefreshRef.current();
      } catch {
        clearSession();
      }
    }, delay);
  }, [clearSession]);

  // Keep the recursive ref current so the async callback always calls the latest version
  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  });

  useEffect(() => {
    bcRef.current =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BROADCAST_CHANNEL) : null;

    bcRef.current?.addEventListener('message', (e: MessageEvent<{ type: string }>) => {
      if (e.data.type === 'logout') {
        clearSession();
      }
    });

    (async () => {
      try {
        const result = await refreshToken();
        tokenStore.set({
          accessToken: result.accessToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
          user: {
            id: result.user.id,
            username: result.user.username,
            fullName: result.user.fullName,
            roles: result.user.roles,
            mustChangePassword: result.user.mustChangePassword,
          },
        });
        setUser(tokenStore.get()!.user);
        setStatus('authenticated');
        scheduleRefresh();
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStatus('anonymous');
        } else {
          setStatus('anonymous');
        }
      }
    })();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      bcRef.current?.close();
    };
  }, [clearSession, scheduleRefresh]);

  const login = useCallback(
    async (req: LoginRequest) => {
      const result = await apiLogin(req);
      tokenStore.set({
        accessToken: result.accessToken,
        expiresAt: Date.now() + result.expiresIn * 1000,
        user: {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          roles: result.user.roles,
          mustChangePassword: result.user.mustChangePassword,
        },
      });
      setUser(tokenStore.get()!.user);
      setStatus('authenticated');
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // best-effort
    }
    bcRef.current?.postMessage({ type: 'logout' });
    clearSession();
  }, [clearSession]);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: string[]) => roles.some((r) => user?.roles.includes(r)) ?? false,
    [user],
  );

  return (
    <AuthContext.Provider value={{ status, user, login, logout, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function getRoleHomeForUser(roles: string[]): string {
  return getRoleHome(roles);
}
