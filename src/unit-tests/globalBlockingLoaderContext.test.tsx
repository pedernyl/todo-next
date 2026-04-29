import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobalBlockingLoaderProvider, useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function BlockingHarness({
  deferred,
  cancellable,
}: {
  deferred: Deferred<string>;
  cancellable: boolean;
}) {
  const { runBlocking } = useGlobalBlockingLoader();

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void runBlocking(async () => deferred.promise, {
            label: "Loading data for accessibility test...",
            cancellable,
          });
        }}
      >
        Start task
      </button>
      <button type="button">Background action</button>
    </div>
  );
}

describe("GlobalBlockingLoaderContext accessibility", () => {
  it("renders overlay with dialog semantics and traps keyboard focus", async () => {
    const deferred = createDeferred<string>();

    render(
      <GlobalBlockingLoaderProvider>
        <BlockingHarness deferred={deferred} cancellable />
      </GlobalBlockingLoaderProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Start task" }));

    const dialog = await screen.findByRole("dialog", { name: "Please wait" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    expect(document.activeElement).toBe(cancelButton);

    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancelButton);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cancelButton);

    const backgroundButton = screen.getByRole("button", { name: "Background action", hidden: true });
    expect(backgroundButton.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("moves focus to dialog when no enabled controls and restores focus after completion", async () => {
    const deferred = createDeferred<string>();

    render(
      <GlobalBlockingLoaderProvider>
        <BlockingHarness deferred={deferred} cancellable={false} />
      </GlobalBlockingLoaderProvider>
    );

    const startButton = screen.getByRole("button", { name: "Start task" });
    startButton.focus();
    expect(document.activeElement).toBe(startButton);

    fireEvent.click(startButton);

    const dialog = await screen.findByRole("dialog", { name: "Please wait" });
    expect(document.activeElement).toBe(dialog);

    const backgroundButton = screen.getByRole("button", { name: "Background action", hidden: true });
    backgroundButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(dialog);

    await act(async () => {
      deferred.resolve("done");
      await deferred.promise;
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Please wait" })).not.toBeInTheDocument();
    });

    expect(document.activeElement).toBe(startButton);
  });
});
