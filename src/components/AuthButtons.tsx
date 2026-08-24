'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";
import { AUTH_IDS, AUTH_TEXT } from "../constants/auth/auth";

export default function AuthButtons() {
  const { data: session, update } = useSession();
  const { runBlocking } = useGlobalBlockingLoader();
  
  useEffect(() => {
    if (session && !session.user?.id) {
      // Refresh the session to get the user.id and user.isAdmin properties
      update();
    }
  }, [session, update]);

  async function handleSignOut() {
    await runBlocking(
      async () => signOut(),
      { label: AUTH_TEXT.SIGNING_OUT, cancellable: false }
    );
  }

  async function handleSignIn() {
    await runBlocking(
      async () => signIn('github', { callbackUrl: '/' }),
      { label: AUTH_TEXT.SIGNING_IN, cancellable: false }
    );
  }

  if (session) {
    return (
  <div
        className="flex items-center justify-between max-w-xl mx-auto gap-1"
        data-testid={AUTH_IDS.LOGGED_IN_CONTAINER}
      >
        <span className="text-gray-700" data-testid={AUTH_IDS.WELCOME_TEXT}>
          {AUTH_TEXT.WELCOME_PREFIX} {session.user?.name}
        </span>
        <button
          onClick={() => {
            void handleSignOut();
          }}
          className="bg-gray-400 text-white px-3 py-1 rounded border border-blue-500 hover:bg-gray-500 transition"
          data-testid={AUTH_IDS.SIGN_OUT_BUTTON}
        >
          {AUTH_TEXT.SIGN_OUT}
        </button>
      </div>
    );
  }

  return (
  <div className="flex justify-center max-w-xl mx-auto" data-testid={AUTH_IDS.LOGGED_OUT_CONTAINER}>
      <button
        onClick={() => {
          void handleSignIn();
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        data-testid={AUTH_IDS.SIGN_IN_BUTTON}
      >
        {AUTH_TEXT.SIGN_IN_WITH_GITHUB}
      </button>
    </div>
  );
}
