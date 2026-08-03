"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface UserIdContextType {
  userId: number | null;
}

const UserIdContext = createContext<UserIdContextType>({ userId: null });

export function useUserId() {
  return useContext(UserIdContext);
}

export function UserIdProvider({ 
  children, 
  initialUserId }: { 
    children: ReactNode, 
    initialUserId: number | null;
  }) {

  return (
    <UserIdContext.Provider value={{ userId: initialUserId }}>
      {children}
    </UserIdContext.Provider>
  );
}
