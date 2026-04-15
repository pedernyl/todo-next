This is a [Next.js](https://nextjs.org) project that demonstrates a small Todo app backed by Supabase with strict Content Security Policy (CSP) and NextAuth for GitHub login.

## Getting Started

First, copy environment variables and run the development server:

```bash
cp .env.local.example .env.local
# edit .env.local and fill in GitHub + Supabase values
```

Then start dev:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## Environment variables

See `.env.example` (copy to `.env.local`) for a fully documented list. Required for local dev:

- NEXT_PUBLIC_BASE_URL=http://localhost:3000
- NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
- NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
- GITHUB_ID / GITHUB_SECRET for NextAuth GitHub provider
- NEXTAUTH_SECRET random string
- Optional: NEXTAUTH_ALLOWED_USERS=comma,separated,emails

In production you typically set `NEXTAUTH_URL` to your site origin.

Additional (optional) hardening / isolation vars:
- `NEXT_CSP_MODE` (off|dev|report-only|enforce) – controls CSP behavior (middleware enforces; report-only emitted by config).
- `NEXT_COEP` (require-corp|credentialless) – enables Cross-Origin-Embedder-Policy for isolation; leave unset if unsure.

## Content Security Policy (CSP)

The CSP is applied via `src/middleware.ts` with a nonce for inline scripts. Modes are controlled by `NEXT_CSP_MODE`:

- dev: permissive for local development (default when NODE_ENV=development unless you explicitly set enforce)
- report-only: strict policy that only reports violations
- enforce: strict policy that blocks violations

During development, we also exclude all `/_next/**` routes from CSP to avoid interfering with Next.js HMR.

To flip to enforce in production once reports are clean:

```bash
# temporary (one run)
NEXT_CSP_MODE=enforce npm run start

# or set in your deployment environment
NEXT_CSP_MODE=enforce
```

The policy automatically whitelists your Supabase project URL (https) and its realtime websocket endpoint (wss) based on `NEXT_PUBLIC_SUPABASE_URL`.

## Security headers

- X-Powered-By is disabled at the framework level to avoid disclosing implementation details.
	- Config: `poweredByHeader: false` in `next.config.ts`
	- Middleware also deletes any stray `x-powered-by` header as defense-in-depth.
- Verify locally:
	```bash
	curl -s -D - http://localhost:3000/ -o /dev/null | grep -i x-powered-by || echo 'No X-Powered-By header'
	```

### ZAP: Suspicious Comments
- ZAP may flag strings in `/_next/static/chunks/*.js` as suspicious comments (rule 10027). These are typically vendor/minified bundle strings, not app source comments. See `scripts/security/README.md` for guidance and ZAP configuration options to reduce false positives.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Testing

- Unit tests (Vitest): see [src/unit-tests/README.md](src/unit-tests/README.md) for commands and setup. Quick run: `npm test`.
- E2E tests (Playwright): see [tests/README.md](tests/README.md) for auth setup and commands. CSP-specific notes: [tests/README-CSP.md](tests/README-CSP.md).

## Admin SQL-Style Updates

Admin-triggered database updates are implemented as TypeScript update files (not runtime SQL files) and are auto-discovered from `src/lib/adminUpdates`.

For naming rules, required exports, and coding conventions, see [src/lib/adminUpdates/README.md](src/lib/adminUpdates/README.md).

## Deploy

Any platform that supports Next.js should work. Ensure you set the required environment variables. For Vercel, configure env vars in the dashboard and set `NEXT_CSP_MODE=enforce` once stable.
