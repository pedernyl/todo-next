import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_PATHS } from "../constants/api/apiPaths";
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
        return new Response(JSON.stringify({ message: "Database copy completed." }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ error: "Unexpected request" }), { status: 500 });
    });
  });

  it("requires explicit mode selection before enabling copy button", async () => {
    render(<AdminDatabaseCopyView />);

    await screen.findByText("Choose how to run the copy");
    const copyButton = screen.getByRole("button", { name: "Copy production to test" });

    expect(copyButton).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /Overwrite/i }));
    expect(copyButton).not.toBeDisabled();
  });

  it("submits selected mode and shows success message", async () => {
    render(<AdminDatabaseCopyView />);

    await screen.findByText("Choose how to run the copy");
    fireEvent.click(screen.getByRole("radio", { name: /Append/i }));
    fireEvent.click(screen.getByRole("button", { name: "Copy production to test" }));

    await waitFor(() => {
      expect(runBlockingFetchMock).toHaveBeenCalledWith(
        API_PATHS.ADMIN.DATABASE_COPY,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ mode: "append" }),
        }),
        { label: "Copying production database to test database...", cancellable: false }
      );
    });

    expect(await screen.findByText("Database copy completed.")).toBeInTheDocument();
  });
});
