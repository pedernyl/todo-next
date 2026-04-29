import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSettingsView from "../components/admin/AdminSettingsView";

const runBlockingFetchMock = vi.fn();

vi.mock("../context/GlobalBlockingLoaderContext", () => ({
  useGlobalBlockingLoader: () => ({
    runBlockingFetch: runBlockingFetchMock,
  }),
}));

describe("AdminSettingsView", () => {
  beforeEach(() => {
    runBlockingFetchMock.mockReset();
    runBlockingFetchMock.mockImplementation(async (input: RequestInfo | URL) => {
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
              {
                type: "Limits",
                settings: [
                  {
                    id: 3,
                    name: "limits",
                    type: "Limits",
                    title: "Limits Settings",
                    description: "",
                    fields: [{ key: "maxItems", label: "Max Items", type: "number" }],
                    values: { maxItems: 5 },
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
  });

  it("renders groups by settings type", async () => {
    render(<AdminSettingsView />);

    await waitFor(() => {
      expect(screen.getByText("App")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("App Settings")).toBeInTheDocument();
      expect(screen.getByText("Debug Settings")).toBeInTheDocument();
    });
  });

  it("ignores invalid number input instead of dirtying the setting", async () => {
    render(<AdminSettingsView />);

    const maxItemsInput = (await screen.findByLabelText("Max Items")) as HTMLInputElement;
    expect(maxItemsInput.value).toBe("5");

    const saveButtons = await screen.findAllByRole("button", { name: "Save" });
    const limitsSaveButton = saveButtons[2];
    expect(limitsSaveButton).toBeDisabled();

    fireEvent.change(maxItemsInput, { target: { value: "" } });

    expect(maxItemsInput.value).toBe("5");
    expect(limitsSaveButton).toBeDisabled();
  });
});
