export default function AdminHomeView() {
  return (
    <section className="rounded border border-slate-300 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-slate-700">Welcome</h2>
      <p className="text-sm text-slate-600">
        Use the left menu to switch between sections. Each section loads its own
        component.
      </p>
    </section>
  );
}
