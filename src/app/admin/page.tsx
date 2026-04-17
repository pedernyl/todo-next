import Link from "next/link";
import AdminAboutView from "@/components/admin/AdminAboutView";
import AdminHomeView from "@/components/admin/AdminHomeView";
import AdminUpdatesView from "@/components/admin/AdminUpdatesView";
import AdminUsersView from "@/components/admin/AdminUsersView";

type AdminView = "home" | "updates" | "users" | "about";

type AdminPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const adminViews: Array<{ key: AdminView; label: string }> = [
  { key: "home", label: "Home" },
  { key: "updates", label: "Updates" },
  { key: "users", label: "Users" },
  { key: "about", label: "About" },
];

function getActiveView(view: string | string[] | undefined): AdminView {
  const raw = Array.isArray(view) ? view[0] : view;

  if (raw === "updates" || raw === "users" || raw === "about") {
    return raw;
  }

  return "home";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeView = getActiveView(resolvedSearchParams.view);
  const activeLabel = adminViews.find((item) => item.key === activeView)?.label ?? "Admin";

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
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <h1 className="text-2xl font-semibold text-slate-700">{activeLabel}</h1>
            <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
              Todos
            </Link>
          </header>

          <div className="p-4 sm:p-6">
            {activeView === "home" && <AdminHomeView />}
            {activeView === "updates" && <AdminUpdatesView />}
            {activeView === "users" && <AdminUsersView />}
            {activeView === "about" && <AdminAboutView />}
          </div>
        </section>
      </div>
    </main>
  );
}
