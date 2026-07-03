import { readFile } from "fs/promises";
import path from "path";
import { renderSanitizedMarkdown } from "../../lib/markdown";
import { ADMIN_VIEW_IDS, ADMIN_VIEW_TEXT } from "../../constants/admin/adminViews";

export default async function AdminAboutView() {
  let html: string;

  try {
    const readmePath = path.join(process.cwd(), "src", "lib", "adminUpdates", "README.md");
    const raw = await readFile(readmePath, "utf-8");
    html = await renderSanitizedMarkdown(raw, "docs");
  } catch {
    html = ADMIN_VIEW_TEXT.ABOUT.LOAD_FAILED_HTML;
  }

  return (
    <section className="rounded border border-slate-300 bg-white shadow-sm" data-testid={ADMIN_VIEW_IDS.ABOUT.SECTION}>
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold text-slate-700" data-testid={ADMIN_VIEW_IDS.ABOUT.HEADING}>{ADMIN_VIEW_TEXT.ABOUT.HEADING}</h2>
      </div>
      <div
        className="prose prose-slate max-w-none px-5 py-4 text-sm"
        data-testid={ADMIN_VIEW_IDS.ABOUT.CONTENT}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
