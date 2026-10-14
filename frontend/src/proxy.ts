import { type NextRequest, NextResponse } from 'next/server';

const STATIC_PREFIXES = ['/_next/static', '/_next/image', '/favicon.ico'];

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
}

function isStaffPath(pathname: string): boolean {
  return (
    pathname.startsWith('/doctor') ||
    pathname.startsWith('/pharmacist') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/queue') ||
    pathname.startsWith('/medicines') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/change-password')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API forwarding
  if (pathname.startsWith('/api/')) {
    const target = process.env['API_PROXY_TARGET'];
    if (target) {
      const targetUrl = new URL(pathname + request.nextUrl.search, target);
      return NextResponse.rewrite(targetUrl);
    }
    return NextResponse.next();
  }

  const isDev = process.env['NODE_ENV'] === 'development';
  const nonce = generateNonce();
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-nonce': nonce,
      }),
    },
  });

  // Security headers on all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'DENY');

  // CSP for page requests
  if (!pathname.startsWith('/api/')) {
    response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev));
  }

  // Cache-Control: no-store for staff pages
  if (isStaffPath(pathname)) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
