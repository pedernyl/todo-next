'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";

export default function AuthButtons() {
  const { data: session } = useSession();
  const { runBlocking } = useGlobalBlockingLoader();

  async function handleSignOut() {
    await runBlocking(
      async () => signOut(),
      { label: "Signing out...", cancellable: false }
    );
  }

  async function handleSignIn() {
    await runBlocking(
      async () => signIn('github', { callbackUrl: '/' }),
      { label: "Signing in...", cancellable: false }
    );
  }

  if (session) {
    return (
  <div className="flex items-center justify-between max-w-xl mx-auto gap-1">
        <span className="text-gray-700">Welcome, {session.user?.name}</span>
        <button
          onClick={() => {
            void handleSignOut();
          }}
          className="bg-gray-400 text-white px-3 py-1 rounded border border-blue-500 hover:bg-gray-500 transition"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
  <div className="flex justify-center max-w-xl mx-auto">
      <button
        onClick={() => {
          void handleSignIn();
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
