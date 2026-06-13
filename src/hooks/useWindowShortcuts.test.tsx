import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowShortcuts } from "./useWindowShortcuts";

const mocks = vi.hoisted(() => ({
  openSettingsWindow: vi.fn(),
  openHistoryWindow: vi.fn(),
}));

vi.mock("../lib/windowApi", () => ({
  openSettingsWindow: () => mocks.openSettingsWindow(),
  openHistoryWindow: () => mocks.openHistoryWindow(),
}));

describe("useWindowShortcuts", () => {
  beforeEach(() => {
    mocks.openSettingsWindow.mockResolvedValue(undefined);
    mocks.openHistoryWindow.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it("opens settings on Cmd/Ctrl comma", () => {
    renderHook(() => useWindowShortcuts());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ",", metaKey: true }));
    expect(mocks.openSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("opens history on Cmd/Ctrl H", () => {
    renderHook(() => useWindowShortcuts());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", metaKey: true }));
    expect(mocks.openHistoryWindow).toHaveBeenCalledTimes(1);
  });
});
