import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AppPreviewFrame from "./AppPreviewFrame";

const tauriInternalsKey = "__TAURI_INTERNALS__";

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)[tauriInternalsKey];
});

describe("AppPreviewFrame", () => {
  it("constrains browser previews to the native main window size", () => {
    render(
      <AppPreviewFrame kind="main">
        <div>Preview content</div>
      </AppPreviewFrame>,
    );

    const frame = screen.getByTestId("browser-preview-window");
    expect(frame.style.width).toBe("500px");
    expect(frame.style.height).toBe("600px");
  });

  it("does not wrap native Tauri windows", () => {
    (window as unknown as Record<string, unknown>)[tauriInternalsKey] = {};

    render(
      <AppPreviewFrame kind="main">
        <div>Native content</div>
      </AppPreviewFrame>,
    );

    expect(screen.queryByTestId("browser-preview-shell")).toBeNull();
    expect(screen.getByText("Native content")).not.toBeNull();
  });
});
