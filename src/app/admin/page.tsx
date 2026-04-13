export default function AdminPage() {

  return (
    <main className="min-h-screen bg-[#edf0f3] text-slate-800">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        <aside className="border-r border-[#1a2734] bg-[#1f2d3b] text-[#d8e0e8]">
          <div className="flex h-14 items-center border-b border-[#2a3a4b] bg-[#1873aa] px-4 text-lg font-semibold">
            Admin
          </div>
          <nav className="p-2">
            {[
              "Home",
              "Updates",
              "Users",
            ].map((item, index) => (
              <a
                key={item}
                href="#"
                className={`mb-1 block rounded px-3 py-2 text-sm transition ${
                  index === 0
                    ? "bg-[#1873aa] text-white"
                    : "text-[#d8e0e8] hover:bg-[#2a3a4b] hover:text-white"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
            <h1 className="text-2xl font-semibold text-slate-700">Adminpanel</h1>
          </header>

        
        </section>
      </div>
    </main>
  );
}
