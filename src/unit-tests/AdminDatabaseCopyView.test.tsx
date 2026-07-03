import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_PATHS } from "../constants/api/apiPaths";
import { GLOBAL } from "../constants/global/global";
import { ADMIN_VIEW_IDS, ADMIN_VIEW_TEXT } from "../constants/admin/adminViews";
import AdminDatabaseCopyView from "../components/admin/AdminDatabaseCopyView";

const runBlockingFetchMock = vi.fn();

vi.mock("../context/GlobalBlockingLoaderContext", () => ({
  useGlobalBlockingLoader: () => ({
    runBlockingFetch: runBlockingFetchMock,
  }),
}));

describe("AdminDatabaseCopyView", () => {
  beforeEach(() => {
    runBlockingFetchMock.mockReset();
    runBlockingFetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === API_PATHS.ADMIN.DATABASE_COPY && (!init || init.method === undefined)) {
        return new Response(JSON.stringify({ available: true, missingVariables: [] }), {
          status: 200,
        });
      }

      if (input === API_PATHS.ADMIN.DATABASE_COPY && init?.method === "POST") {
        return new Response(JSON.stringify({ message: ADMIN_VIEW_TEXT.DATABASE_COPY.COPY_COMPLETED }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ error: "Unexpected request" }), { status: 500 });
    });
  });

  it("requires explicit mode selection before enabling copy button", async () => {
    render(<AdminDatabaseCopyView />);

    await screen.findByText(ADMIN_VIEW_TEXT.DATABASE_COPY.MODE_LEGEND);
    const copyButton = screen.getByTestId(ADMIN_VIEW_IDS.DATABASE_COPY.RUN_BUTTON);

    expect(copyButton).toBeDisabled();

    fireEvent.click(screen.getByTestId(ADMIN_VIEW_IDS.DATABASE_COPY.MODE_OVERWRITE));
    expect(copyButton).not.toBeDisabled();
  });

  it("submits selected mode and shows success message", async () => {
    render(<AdminDatabaseCopyView />);

    await screen.findByText(ADMIN_VIEW_TEXT.DATABASE_COPY.MODE_LEGEND);
    fireEvent.click(screen.getByTestId(ADMIN_VIEW_IDS.DATABASE_COPY.MODE_APPEND));
    fireEvent.click(screen.getByTestId(ADMIN_VIEW_IDS.DATABASE_COPY.RUN_BUTTON));

    await waitFor(() => {
      expect(runBlockingFetchMock).toHaveBeenCalledWith(
        API_PATHS.ADMIN.DATABASE_COPY,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ mode: "append" }),
        }),
        { label: GLOBAL.LOADER_LABELS.COPYING_DATABASE, cancellable: false }
      );
    });

    expect(await screen.findByText(ADMIN_VIEW_TEXT.DATABASE_COPY.COPY_COMPLETED)).toBeInTheDocument();
  });
});
