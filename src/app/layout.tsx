import "./globals.css";
import Providers from './providers';
import type { ReactNode } from "react";
import { cookies } from 'next/headers';
import { CspNonceProvider } from '../context/CspNonceContext';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  // cookies() returns a ReadonlyRequestCookies; use get when available
  const nonce = typeof cookieStore.get === 'function' ? cookieStore.get('csp-nonce')?.value || null : null;
  
  return (
    <html lang="en">
      <body>
        <Providers>
          <CspNonceProvider nonce={nonce}>{children}</CspNonceProvider>
        </Providers>
      </body>
    </html>
  );
}
