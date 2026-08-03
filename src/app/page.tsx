
import { getTodos } from '../lib/dataService';
import { getTodoLoadPolicy, computeEffectiveLimit } from '../lib/todoLoadPolicy';
import { getAppSettings } from '../lib/appSettings';
import AuthButtons from '../components/AuthButtons';
import { redirect } from "next/navigation";
import { getAppServerSession } from "../lib/appServerSession";
import Link from "next/link";
import TodoPageClient from "./TodoPageClient";
import type { Metadata } from 'next';
import { getDevTitle, isTestDbActive } from '../lib/environmentMode';
import { ADMIN_NAV_TEXT, ADMIN_TEST_IDS } from '../constants/admin/adminNavigation';
import { getCategories } from '@/lib/categoryService';
import { getAuthenticatedUserId } from '@/lib/userService';

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const appSettings = await getAppSettings();
  return {
    title: getDevTitle(appSettings.appName),
  };
}

export default async function Home() {
  const session = await getAppServerSession();
  // Redirect if no user is logged in
  if (!session) {
    redirect("/login");
  }

  // isAdmin is a session-time snapshot; 
  // promotion/demotion requires re-login to update this link (real access is still enforced server-side).
  const canAccessAdmin = session.user?.isAdmin;
  const userId = session.user?.id ?? await getAuthenticatedUserId();
  
  const policy = await getTodoLoadPolicy();
  const effectiveLimit = computeEffectiveLimit(policy);
  const todos = await getTodos(true, undefined, effectiveLimit);
  const initialCategories = await getCategories({ 
    ownerId: userId, 
    completed: false, 
    deleted: false 
  });
  const appSettings = await getAppSettings();
  const testDbActive = isTestDbActive();
  const titleClassName = testDbActive
    ? 'bg-emerald-600 text-white border-emerald-700'
    : 'bg-transparent text-slate-800 border-transparent';

  return (
    <div className="min-h-screen bg-gray-100 p-10 font-sans relative">
      {/* AuthButtons in upper left corner */}
      <div className="absolute left-10 top-2 z-10">
        <AuthButtons />
      </div>
      {canAccessAdmin && (
        <div className="absolute right-10 top-12 z-10">
          <Link href="/admin" 
            className="text-sm font-semibold text-blue-700 hover:underline" 
            data-testid={ADMIN_TEST_IDS.ENTRY_LINK}
          >
            {ADMIN_NAV_TEXT.ENTRY_LINK}
          </Link>
        </div>
      )}
      <div className={`sticky top-3 z-20 mb-8 mt-16 rounded border px-4 py-3 text-center shadow-sm ${titleClassName}`}>
        <h1 className="text-3xl font-bold">{getDevTitle(appSettings.appName)}</h1>
      </div>
      <TodoPageClient 
        initialTodos={todos}
        initialCategories={initialCategories} 
       />
    </div>
  );
}