import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildBaseCsp(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let connectExtras = '';
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl);
      const httpsOrigin = `${u.protocol}//${u.host}`;
      const wssOrigin = `wss://${u.host}`;
      connectExtras = ` ${httpsOrigin} ${wssOrigin}`;
    }
  } catch {
    // ignore malformed env
  }

  return (
    "default-src 'none'; " +
    "base-uri 'self'; " +
    "script-src 'self'; " +
    "style-src 'self'; " +
    "img-src 'self' data:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    `connect-src 'self'${connectExtras}; ` +
    "object-src 'none'; " +
    "frame-ancestors 'none'; " +
    "form-action 'self'; " +
    'report-uri /api/csp-report;'
  );
}

function buildCsp(mode: string, nonce: string) {
  const CSP_BASE = buildBaseCsp();
  const nonceToken = ` 'nonce-${nonce}'`;
  const withNonce = CSP_BASE.replace("script-src 'self'", `script-src 'self'${nonceToken}`);
  if (mode === 'enforce') return withNonce.replace('report-uri /api/csp-report;', '');
  if (mode === 'report-only') return withNonce;
  if (mode === 'off') return '';
  if (process.env.NODE_ENV === 'development' || mode === 'dev') {
    return "default-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob:; connect-src 'self' ws: wss: http://localhost:3000; font-src 'self' data:";
  }
  return '';
}

export function proxy(request: NextRequest) {
  void request;
  let mode = (process.env.NEXT_CSP_MODE || 'report-only').toLowerCase();
  if (process.env.NODE_ENV === 'development' && mode !== 'enforce' && mode !== 'off') {
    mode = 'dev';
  }

  let nonce = '';
  try {
    const arr = globalThis.crypto.getRandomValues(new Uint8Array(12));
    let binary = '';
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
    nonce = typeof btoa === 'function' ? btoa(binary) : '';
  } catch {
    nonce = '';
  }

  const csp = buildCsp(mode, nonce);
  const res = NextResponse.next();

  if (csp) {
    if (mode === 'enforce') res.headers.set('Content-Security-Policy', csp);
    else if (mode === 'report-only') res.headers.set('Content-Security-Policy-Report-Only', csp);
    else if (mode === 'dev') res.headers.set('Content-Security-Policy', csp);
  }

  const cookieOptions: {
    httpOnly: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path: string;
    secure?: boolean;
  } = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookies.set('csp-nonce', nonce, cookieOptions);

  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.delete('x-powered-by');

  return res;
}

export const config = {
  matcher: '/((?!_next/|favicon.ico).*)',
};
