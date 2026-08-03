"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { UserIdProvider } from "../context/UserIdContext";
import { GlobalBlockingLoaderProvider } from "../context/GlobalBlockingLoaderContext";

export default function Providers({ 
  children, 
  initialUserId }: { 
    children: ReactNode, 
    initialUserId: number | null 
  }) {
  return (
    <SessionProvider>
      <GlobalBlockingLoaderProvider>
        <UserIdProvider initialUserId={initialUserId}>{children}</UserIdProvider>
      </GlobalBlockingLoaderProvider>
    </SessionProvider>
  );
}
