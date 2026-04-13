const users = [
  { name: "Admin", role: "Administrator", status: "Active" },
  { name: "Editor", role: "Editor", status: "Active" },
  { name: "Support", role: "Support", status: "Pending" },
];

export default function AdminUsersView() {
  return (
    <section className="rounded border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">Users overview</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.name}
            className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-700">{user.name}</span>
            <span className="text-slate-600">{user.role}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                user.status === "Active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {user.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
