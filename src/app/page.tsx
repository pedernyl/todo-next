
import { getTodos } from '../lib/dataService';
import { getTodoLoadPolicy, computeEffectiveLimit } from '../lib/todoLoadPolicy';
import AuthButtons from '../components/AuthButtons';
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import { isAdminEmail } from "../lib/adminAccess";
import Link from "next/link";
import TodoPageClient from "./TodoPageClient";
import type { Metadata } from 'next';
import { getDevTitle, isTestDbActive } from '../lib/environmentMode';

export const metadata: Metadata = {
  title: getDevTitle('Todo App'),
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  // Redirect if no user is logged in
  if (!session) {
    redirect("/login");
  }

  const canAccessAdmin = await isAdminEmail(session.user?.email);

  const policy = await getTodoLoadPolicy();
  const effectiveLimit = computeEffectiveLimit(policy);
  const todos = await getTodos(true, undefined, effectiveLimit);
  const testDbActive = isTestDbActive();
  const titleClassName = testDbActive
    ? 'bg-emerald-600 text-white border-emerald-700'
    : 'bg-white text-slate-800 border-slate-200';

  return (
    <div className="min-h-screen bg-gray-100 p-10 font-sans relative">
      {/* AuthButtons in upper left corner */}
      <div className="absolute left-10 top-2 z-10">
        <AuthButtons />
      </div>
      {canAccessAdmin && (
        <div className="absolute right-10 top-12 z-10">
          <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
            Admin
          </Link>
        </div>
      )}
      <div className={`sticky top-3 z-20 mb-8 mt-16 rounded border px-4 py-3 text-center shadow-sm ${titleClassName}`}>
        <h1 className="text-3xl font-bold">{getDevTitle('Todo App')}</h1>
      </div>
      <TodoPageClient initialTodos={todos} />
    </div>
  );
}