import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";

export default async function AdminAboutView() {
  let html: string;

  try {
    const readmePath = path.join(process.cwd(), "src", "lib", "adminUpdates", "README.md");
    const raw = await readFile(readmePath, "utf-8");
    html = await marked(raw);
  } catch {
    html = "<p>Could not load README.md.</p>";
  }

  return (
    <section className="rounded border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold text-slate-700">About</h2>
      </div>
      <div
        className="prose prose-slate max-w-none px-5 py-4 text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
