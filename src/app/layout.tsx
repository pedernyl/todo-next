import "./globals.css";
import Providers from './providers';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../lib/authOptions";
import { fetchUserIdByEmail } from "@/lib/userService";
import type { ReactNode } from "react";
import { cookies } from 'next/headers';
import { CspNonceProvider } from '../context/CspNonceContext';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  // cookies() returns a ReadonlyRequestCookies; use get when available
  const nonce = typeof cookieStore.get === 'function' ? cookieStore.get('csp-nonce')?.value || null : null;
  const session = await getServerSession(authOptions);
  
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
