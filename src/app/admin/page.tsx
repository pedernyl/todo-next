import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from 'next';
import AdminAboutView from "@/components/admin/AdminAboutView";
import AdminHomeView from "@/components/admin/AdminHomeView";
import AdminSettingsView from "@/components/admin/AdminSettingsView";
import AdminDatabaseCopyView from "@/components/admin/AdminDatabaseCopyView";
import AdminUpdatesView from "@/components/admin/AdminUpdatesView";
import AdminUsersView from "@/components/admin/AdminUsersView";
import { getAdminAccessCheckResult } from "@/lib/adminAccess";
import { getDevTitle, isTestDbActive } from '@/lib/environmentMode';

type AdminPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

type AdminMetadataProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const adminViews: Array<{ key: string; label: string }> = [
  { key: "home", label: "Home" },
  { key: "settings", label: "Settings" },
  { key: "database-copy", label: "Database copy" },
  { key: "updates", label: "Updates" },
  { key: "users", label: "Users" },
  { key: "about", label: "About" },
];

function isAdminView(value: string | undefined): value is (typeof adminViews)[number]["key"] {
  if (!value) {
    return false;
  }

  return adminViews.some((item) => item.key === value);
}

function getActiveView(
  view: string | string[] | undefined
): (typeof adminViews)[number]["key"] {
  const raw = Array.isArray(view) ? view[0] : view;

  if (isAdminView(raw)) {
    return raw;
  }

  return "home";
}

function getActiveLabel(view: string | string[] | undefined): string {
  const activeView = getActiveView(view);
  return adminViews.find((item) => item.key === activeView)?.label ?? "Admin";
}

export function generateMetadata(): Metadata {
  return {
    title: getDevTitle("Admin"),
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  // Authorization boundary for all Admin views: keep checks here (and in admin APIs).
  // Proxy also enforces /admin access as an additional layer.
  const access = await getAdminAccessCheckResult();
  if (!access.ok && access.reason === "unauthenticated") {
    redirect("/login");
  }
  if (!access.ok) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const activeView = getActiveView(resolvedSearchParams?.view);
  const activeLabel = getActiveLabel(resolvedSearchParams?.view);
  const testDbActive = isTestDbActive();
  const headerClassName = testDbActive
    ? 'bg-emerald-600 text-white border-emerald-700'
    : 'bg-white text-slate-700 border-slate-200';

  return (
    <main className="min-h-screen bg-[#edf0f3] text-slate-800">
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-[auto_1fr]">
        <aside className="border-r border-[#1a2734] bg-[#1f2d3b] text-[#d8e0e8]">
          <div className="flex h-14 items-center border-b border-[#2a3a4b] bg-[#1873aa] px-4 text-lg font-semibold">
            Admin
          </div>
          <nav className="p-2">
            {adminViews.map((item) => (
              <Link
                key={item.key}
                data-testid={`admin-link-${item.key}`}
                href={item.key === "home" ? "/admin" : `/admin?view=${item.key}`}
                className={`mb-1 block rounded px-3 py-2 text-sm transition ${
                  activeView === item.key
                    ? "bg-[#1873aa] text-white"
                    : "text-[#d8e0e8] hover:bg-[#2a3a4b] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className={`sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 sm:px-6 ${headerClassName}`}>
            <h1 className="text-2xl font-semibold">{getDevTitle(activeLabel)}</h1>
            <Link 
              href="/" 
              prefetch={false} 
              className={`
                text-sm font-semibold hover:underline 
                ${testDbActive ? 'text-white' : 'text-blue-700'}
                `}
              data-testid="admin-link-todos"
              >
              Todos
            </Link>
          </header>

          <div className="p-4 sm:p-6">
            {activeView === "home" && <AdminHomeView />}
            {activeView === "settings" && <AdminSettingsView />}
            {activeView === "database-copy" && <AdminDatabaseCopyView />}
            {activeView === "updates" && <AdminUpdatesView />}
            {activeView === "users" && <AdminUsersView />}
            {activeView === "about" && <AdminAboutView />}
          </div>
        </section>
      </div>
    </main>
  );
}
