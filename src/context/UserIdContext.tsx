"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useGlobalBlockingLoader } from "./GlobalBlockingLoaderContext";

interface UserIdContextType {
  userId: number | null;
}

const UserIdContext = createContext<UserIdContextType>({ userId: null });

export function useUserId() {
  return useContext(UserIdContext);
}

export function UserIdProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [userId, setUserId] = useState<number | null>(null);
  const { runBlockingFetch } = useGlobalBlockingLoader();

  useEffect(() => {
    async function fetchUserId() {
      if (session?.user?.email) {
        try {
          const res = await runBlockingFetch(
            "/api/userid?email=" + encodeURIComponent(session.user.email),
            undefined,
            { label: "Loading account information...", cancellable: true }
          );
          if (res.ok) {
            const data = await res.json();
            setUserId(data.userId ?? null);
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }
    }
    fetchUserId();
  }, [session?.user?.email, runBlockingFetch]);

  return (
    <UserIdContext.Provider value={{ userId }}>
      {children}
    </UserIdContext.Provider>
  );
}
