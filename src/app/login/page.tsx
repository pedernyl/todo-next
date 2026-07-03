"use client";
import AuthButtons from "../../components/AuthButtons";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AUTH_IDS, AUTH_TEXT } from "../../constants/auth/auth";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6" data-testid={AUTH_IDS.LOGIN_PAGE_CONTAINER}>
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md text-center" data-testid={AUTH_IDS.LOGIN_PAGE_CARD}>
        <h1 className="text-3xl font-bold mb-6" data-testid={AUTH_IDS.LOGIN_HEADING}>{AUTH_TEXT.LOGIN_HEADING}</h1>
        <p className="mb-4 text-gray-600" data-testid={AUTH_IDS.LOGIN_DESCRIPTION}>
          {AUTH_TEXT.LOGIN_DESCRIPTION}
        </p>
        <AuthButtons />
      </div>
    </div>
  );
}
