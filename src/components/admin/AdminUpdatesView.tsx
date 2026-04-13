type UpdateItem = {
  name: string;
  type: "Core" | "Plugin" | "Theme";
  currentVersion: string;
  availableVersion: string;
};

const availableUpdates: UpdateItem[] = [

];

export default function AdminUpdatesView() {
  return (
    <section className="rounded border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold text-slate-700">Available updates</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Current</th>
              <th className="px-5 py-3 font-medium">Available</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {availableUpdates.map((item) => (
              <tr key={item.name} className="border-t border-slate-200">
                <td className="px-5 py-3 text-slate-700">{item.name}</td>
                <td className="px-5 py-3 text-slate-600">{item.type}</td>
                <td className="px-5 py-3 text-slate-600">{item.currentVersion}</td>
                <td className="px-5 py-3 font-medium text-slate-700">{item.availableVersion}</td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
