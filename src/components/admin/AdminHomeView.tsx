import { ADMIN_VIEW_IDS, ADMIN_VIEW_TEXT } from "../../constants/admin/adminViews";

export default function AdminHomeView() {
  return (
    <section className="rounded border border-slate-300 bg-white p-5 shadow-sm" data-testid={ADMIN_VIEW_IDS.HOME.SECTION}>
      <h2 className="mb-2 text-lg font-semibold text-slate-700" data-testid={ADMIN_VIEW_IDS.HOME.HEADING}>{ADMIN_VIEW_TEXT.HOME.HEADING}</h2>
      <p className="text-sm text-slate-600" data-testid={ADMIN_VIEW_IDS.HOME.DESCRIPTION}>
        {ADMIN_VIEW_TEXT.HOME.DESCRIPTION}
      </p>
    </section>
  );
}
