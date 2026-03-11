# ZAP: Suspicious Comments in Vendor Bundles

This project uses Next.js, React, and polyfills that ship minified vendor code under `/_next/static/chunks/*.js`. ZAP’s rule 10027 (Information Disclosure - Suspicious Comments) can flag strings inside these bundles that look like comments (e.g., `//react.dev/errors/...`, `//github.com/...`) or keywords (`SELECT`, `BUG`, `FROM`) embedded in minified code. These are typically false positives and not actionable app source comments.

## Why this happens
- Modern JS bundles include error URL strings, license references, and internal keywords as part of minified code.
- Next.js/SWC minification removes most comments, but strings remain by design.
- ZAP scans static JS files without context, so it matches patterns inside strings.

## Recommended approach
- Scan the production build (minified) rather than dev.
- Keep strong security headers (CSP, CORP, COOP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) — already configured in this repo.
- Treat 10027 findings in `/_next/static/chunks/*` as vendor-related unless the evidence points to app-authored comments.

## ZAP configuration options
1. Increase threshold for rule 10027 (Passive Scan → Information Disclosure - Suspicious Comments).
2. Add URL exclusions for `/_next/static/chunks/*` and `/_next/static/polyfills*`.
3. In automation/CI, configure rule overrides to `IGNORE` or `LOW` for these paths.

### Example automation override (ZAP CLI)
If you use ZAP automation, set rule 10027 to a higher threshold or ignore for bundle paths. Example pseudo-config:

```
rules:
    - id: 10027
        action: ignore
        targetUrls:
            - "/_next/static/chunks/*"
            - "/_next/static/polyfills*"
```

Note: Keep license files intact and avoid destructive post-build comment stripping that could break source maps or violate licensing. If you still want to strip block comments from static JS, do so carefully and preserve license notices separately.

## When to act
- If ZAP flags comments in your own source files (e.g., `/src/**` served as JS), review and remove sensitive information.
- Otherwise, document these bundle-level false positives and proceed with hardened headers, as implemented.

# Quick Security Scan

This folder contains a script to run a basic OWASP ZAP security scan.

---

## Quick Start

1. Make sure your app is running:
```bash
npm run build && npm run start - dont forget csp settings

    Run the scan:

./security/security-scan.sh http://localhost:3000

    Open the report:

    HTML report: security/zap-report.html

    The scan checks for common web security issues like XSS and missing headers.
    No sensitive keys are included, and Docker is required.

ZAP Redirect Warning
  Next.js App Router may trigger a ZAP warning about a redirect with body because server components and layouts start generating HTML before the page redirect executes. Even though the redirect happens early, no sensitive data is exposed, and the HTML body ZAP sees is internal Next.js content. This is a false positive, and the redirect is safe. Optionally, moving the redirect to a layout that wraps protected pages can remove the warning entirely.    