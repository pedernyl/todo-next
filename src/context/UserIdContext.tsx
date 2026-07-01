"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { API_PATHS } from "../constants/api/apiPaths";
import { useGlobalBlockingLoader } from "./GlobalBlockingLoaderContext";
import { GLOBAL } from "../constants/global/global";

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
            API_PATHS.userIdByEmail(session.user.email),
            undefined,
            { label: GLOBAL.LOADER_LABELS.LOADING_ACCOUNT_INFO, cancellable: true }
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
