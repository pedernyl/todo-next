"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { GlobalBlockingLoaderProvider } from "../context/GlobalBlockingLoaderContext";

export default function Providers({ 
  children, 
  }: { 
    children: ReactNode
  }) {
  return (
    <SessionProvider>
      <GlobalBlockingLoaderProvider>
        {children}
      </GlobalBlockingLoaderProvider>
    </SessionProvider>
  );
}
