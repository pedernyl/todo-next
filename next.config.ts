import type { NextConfig } from "next";

// Minimal CSP strings. We'll start in report-only mode so violations are reported
// without blocking behavior. Tweak these directives later as you inventory external hosts.
const CSP_REPORT_ONLY =
  "default-src 'none'; base-uri 'self'; script-src 'self'; style-src 'self' https:; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; report-uri /api/csp-report;";

const CSP_DEV =
  "default-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob:; connect-src 'self' ws: wss: http://localhost:3000; font-src 'self' data:";

const nextConfig: NextConfig = {
  // Remove X-Powered-By header to avoid disclosing framework details
  poweredByHeader: false,
  async headers() {
    const isTestDbRuntimeMappingActive =
      process.env.NEXT_PUBLIC_SUPABASE_TEST_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL === process.env.NEXT_PUBLIC_SUPABASE_TEST_URL;
    const isProductionBuild = process.env.NODE_ENV === 'production';
    if (isProductionBuild && isTestDbRuntimeMappingActive && process.env.ALLOW_TEST_DB_BUILD !== 'true') {
      throw new Error(
        'Refusing production build with test DB runtime variables. Set ALLOW_TEST_DB_BUILD=true only if intentional.'
      );
    }

    const mode = (process.env.NEXT_CSP_MODE || 'report-only').toLowerCase();

    // Always apply general security headers from next.config.ts (to pages, API and static assets)
    const securityHeaders: { key: string; value: string }[] = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    ];

    // Base routes that always receive the general security headers
    // For stronger Spectre site isolation: set static assets & favicon as same-origin
    const staticHeaders = [
      ...securityHeaders,
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    ];
    // Root/pages/API continue to rely on middleware for CORP 'same-origin'.
    const routes: Array<{ source: string; headers: { key: string; value: string }[] }> = [
      { source: '/_next/static/(.*)', headers: staticHeaders },
      { source: '/favicon.ico', headers: staticHeaders },
      { source: '/(.*)', headers: [...securityHeaders, { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }] },
    ];

    // Optional COEP, gated via env to protect NextAuth GitHub and other third-party flows
    // NEXT_COEP=require-corp | credentialless
    const coep = (process.env.NEXT_COEP || '').toLowerCase();
    if (coep === 'require-corp' || coep === 'credentialless') {
      routes[routes.length - 1].headers.push({
        key: 'Cross-Origin-Embedder-Policy',
        value: coep,
      });
    }

    // Only emit CSP Report-Only here; enforced CSP is handled in middleware.
    if (mode === 'report-only') {
      // Dynamically include Supabase origins in connect-src for accurate reporting.
      let value = CSP_REPORT_ONLY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const u = new URL(supabaseUrl);
          const httpsOrigin = `${u.protocol}//${u.host}`; // e.g. https://xyz.supabase.co
          const wssOrigin = `wss://${u.host}`;
          value = value.replace(
            "connect-src 'self';",
            `connect-src 'self' ${httpsOrigin} ${wssOrigin};`
          );
        } catch {
          // ignore malformed URL
        }
      }
      // Append the report-only header to the catch-all route
      routes[routes.length - 1].headers.push({ key: 'Content-Security-Policy-Report-Only', value });
    }

    // For dev/enforce/off, do not add any CSP header here (middleware controls enforcement).
    return routes;
  },
};

export default nextConfig;
