"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { UserIdProvider } from "../context/UserIdContext";
import { GlobalBlockingLoaderProvider } from "../context/GlobalBlockingLoaderContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GlobalBlockingLoaderProvider>
        <UserIdProvider>{children}</UserIdProvider>
      </GlobalBlockingLoaderProvider>
    </SessionProvider>
  );
}
