"use client";

import { useEffect, useMemo, useState } from "react";

type UserItem = {
  id: number;
  email: string;
  isAdmin: boolean;
};

export default function AdminUsersView() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await res.json()) as { users?: UserItem[]; error?: string };

      if (!res.ok || !data.users) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const hasUsers = useMemo(() => users.length > 0, [users.length]);

  return (
    <section className="rounded border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">Users overview</h2>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      {isLoading && <p className="text-sm text-slate-600">Loading users...</p>}
      {!isLoading && !hasUsers && <p className="text-sm text-slate-600">No users found.</p>}

      <div className="mb-2 grid grid-cols-[80px_1fr_110px] px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>ID</span>
        <span>Email</span>
        <span>Admin</span>
      </div>

      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="grid grid-cols-[80px_1fr_110px] items-center rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-700">#{user.id}</span>
            <span className="text-slate-600">{user.email || "(no email)"}</span>
            <span>
              <span
                className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                  user.isAdmin
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {user.isAdmin ? "Yes" : "No"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
