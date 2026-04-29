import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminSettingsView from "../components/admin/AdminSettingsView";

const runBlockingFetchMock = vi.fn(async (input: RequestInfo | URL) => {
  if (input === "/api/admin/settings") {
    return new Response(
      JSON.stringify({
        groups: [
          {
            type: "App",
            settings: [
              {
                id: 1,
                name: "app",
                type: "App",
                title: "App Settings",
                description: "",
                fields: [{ key: "appName", label: "Application Name", type: "text" }],
                values: { appName: "Todo Next" },
                changedBy: null,
                changedTimestamp: null,
              },
            ],
          },
          {
            type: "Debug",
            settings: [
              {
                id: 2,
                name: "debug",
                type: "Debug",
                title: "Debug Settings",
                description: "",
                fields: [{ key: "debugEnabled", label: "Enable Debug", type: "boolean" }],
                values: { debugEnabled: false },
                changedBy: null,
                changedTimestamp: null,
              },
            ],
          },
        ],
      }),
      { status: 200 }
    );
  }

  return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
});

vi.mock("../context/GlobalBlockingLoaderContext", () => ({
  useGlobalBlockingLoader: () => ({
    runBlockingFetch: runBlockingFetchMock,
  }),
}));

describe("AdminSettingsView", () => {
  it("renders groups by settings type", async () => {
    render(<AdminSettingsView />);

    await waitFor(() => {
      expect(screen.getByText("App")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("App Settings")).toBeInTheDocument();
      expect(screen.getByText("Debug Settings")).toBeInTheDocument();
    });
  });
});
