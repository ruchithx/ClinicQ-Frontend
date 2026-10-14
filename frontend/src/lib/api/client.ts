import { env } from '@/lib/env';
import { tokenStore } from '@/lib/auth/token-store';
import { ApiError, parseApiError } from './problem';
import type { ErrorCode } from './error-messages';

export interface FetchOptions {
  query?: Record<string, string | number | boolean | string[] | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  ifNoneMatch?: string;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface FetchResult<T> {
  data: T;
  etag?: string;
  notModified?: false;
}

export interface NotModifiedResult {
  notModified: true;
}

// Single-flight refresh promise
let refreshPromise: Promise<void> | null = null;

/** Build a URL path with parameter substitution + query string */
export function buildPath(
  template: string,
  params: Record<string, string | number>,
): string {
  let path = template;
  for (const [k, v] of Object.entries(params)) {
    path = path.replace(`{${k}}`, encodeURIComponent(String(v)));
  }
  return path;
}

function buildQueryString(
  query: Record<string, string | number | boolean | string[] | null | undefined>,
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function executeRefresh(): Promise<void> {
  const { refreshToken: doRefresh } = await import('./endpoints');
  const result = await doRefresh();
  // Store the new token
  const { accessToken, expiresIn, user } = result;
  tokenStore.set({
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword,
    },
  });
}

async function singleFlightRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = executeRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doFetch<T>(
  method: string,
  path: string,
  options: FetchOptions = {},
  isRetry = false,
): Promise<FetchResult<T> | NotModifiedResult> {
  const { query, body, headers: extraHeaders, idempotencyKey, ifNoneMatch, signal, credentials } =
    options;

  const url =
    env.NEXT_PUBLIC_API_BASE_PATH + path + (query ? buildQueryString(query) : '');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': crypto.randomUUID(),
    'X-Requested-With': 'XMLHttpRequest',
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const stored = tokenStore.get();
  if (stored?.accessToken) {
    headers['Authorization'] = `Bearer ${stored.accessToken}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  if (ifNoneMatch) {
    headers['If-None-Match'] = ifNoneMatch;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: credentials ?? 'same-origin',
    });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error', String(err), [], null, {});
  }

  // 304 Not Modified
  if (response.status === 304) {
    return { notModified: true };
  }

  // Extract ETag
  const etag = response.headers.get('ETag') ?? undefined;

  // 204 No Content
  if (response.status === 204) {
    return { data: undefined as T, etag };
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  // Error responses
  if (!response.ok) {
    let problemBody: unknown;
    if (contentType.includes('application/problem+json') || contentType.includes('application/json')) {
      try {
        problemBody = await response.json();
      } catch {
        problemBody = null;
      }
    }
    const apiError = parseApiError(response.status, problemBody);

    // Handle 401 with token refresh (not for refresh endpoint itself, not on retry)
    if (
      response.status === 401 &&
      !isRetry &&
      (apiError.code === 'TOKEN_EXPIRED' ||
        (apiError.code === 'UNAUTHENTICATED' && tokenStore.get()))
    ) {
      try {
        await singleFlightRefresh();
        return doFetch<T>(method, path, options, true);
      } catch (refreshErr) {
        if (
          refreshErr instanceof ApiError &&
          refreshErr.code === ('REFRESH_TOKEN_ROTATED' as ErrorCode)
        ) {
          // Reuse detection: wait 500ms and retry once more
          await new Promise((r) => setTimeout(r, 500));
          try {
            await singleFlightRefresh();
            return doFetch<T>(method, path, options, true);
          } catch {
            // Fall through to session clear
          }
        }
        // Refresh failed - clear session and redirect
        tokenStore.clear();
        const { getQueryClient } = await import('../query-client');
        getQueryClient().clear();
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?next=${next}&reason=expired`);
        throw refreshErr;
      }
    }

    // 403 PASSWORD_CHANGE_REQUIRED -> redirect
    if (response.status === 403 && apiError.code === 'PASSWORD_CHANGE_REQUIRED') {
      window.location.replace('/change-password');
      throw apiError;
    }

    throw apiError;
  }

  const data = (await response.json()) as T;
  return { data, etag };
}

/** Main API fetch function */
export async function apiFetch<T>(
  method: string,
  path: string,
  options?: FetchOptions,
): Promise<FetchResult<T> | NotModifiedResult> {
  return doFetch<T>(method, path, options);
}

/** Convenience wrappers */
export async function apiGet<T>(
  path: string,
  options?: FetchOptions,
): Promise<FetchResult<T> | NotModifiedResult> {
  return apiFetch<T>('GET', path, options);
}

export async function apiPost<T>(path: string, options?: FetchOptions): Promise<FetchResult<T>> {
  const result = await apiFetch<T>('POST', path, options);
  if ('notModified' in result) throw new Error('Unexpected 304 on POST');
  return result;
}

export async function apiPut<T>(path: string, options?: FetchOptions): Promise<FetchResult<T>> {
  const result = await apiFetch<T>('PUT', path, options);
  if ('notModified' in result) throw new Error('Unexpected 304 on PUT');
  return result;
}
