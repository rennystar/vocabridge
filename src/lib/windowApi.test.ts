import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeHistoryWindow,
  closeSettingsWindow,
  openHistoryWindow,
  openSettingsWindow,
  listenForHistorySnapshot,
  listenForHistoryUpdates,
  requestLookupFromHistory,
  requestSnapshotFromHistory,
} from "./windowApi";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mocks.invoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mocks.listen(...args),
}));

describe("windowApi", () => {
  beforeEach(() => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {
        invoke: vi.fn(),
        transformCallback: vi.fn(),
      },
      configurable: true,
    });
    mocks.invoke.mockResolvedValue(undefined);
    mocks.invoke.mockClear();
    mocks.listen.mockClear();
  });

  it("opens settings through the backend command", async () => {
    await openSettingsWindow();
    expect(mocks.invoke).toHaveBeenCalledWith("open_settings_window");
  });

  it("opens history through the backend command", async () => {
    await openHistoryWindow();
    expect(mocks.invoke).toHaveBeenCalledWith("open_history_window");
  });

  it("closes settings through the backend command", async () => {
    await closeSettingsWindow();
    expect(mocks.invoke).toHaveBeenCalledWith("close_settings_window");
  });

  it("closes history through the backend command", async () => {
    await closeHistoryWindow();
    expect(mocks.invoke).toHaveBeenCalledWith("close_history_window");
  });

  it("sends history lookup requests with focus intent", async () => {
    await requestLookupFromHistory("bridge", "free_dictionary", true);
    expect(mocks.invoke).toHaveBeenCalledWith("request_lookup_from_history", {
      word: "bridge",
      source: "free_dictionary",
      focusMain: true,
    });
  });

  it("sends saved history snapshot requests with focus intent", async () => {
    await requestSnapshotFromHistory("bridge", "free_dictionary", true);
    expect(mocks.invoke).toHaveBeenCalledWith("request_snapshot_from_history", {
      cacheKey: "bridge",
      source: "free_dictionary",
      focusMain: true,
    });
  });

  it("listens for saved history snapshots", async () => {
    const handler = vi.fn();
    const entry = { word: "bridge", source: "free_dictionary", entries: [] };
    await listenForHistorySnapshot(handler);

    expect(mocks.listen).toHaveBeenCalledWith("history:snapshot", expect.any(Function));

    const callback = mocks.listen.mock.calls[0][1] as (event: {
      payload: unknown;
    }) => void;
    callback({ payload: { entry, focusMain: false } });

    expect(handler).toHaveBeenCalledWith({ entry, focusMain: false });
  });

  it("listens for completed history updates", async () => {
    const handler = vi.fn();
    await listenForHistoryUpdates(handler);

    expect(mocks.listen).toHaveBeenCalledWith("history:updated", expect.any(Function));

    const callback = mocks.listen.mock.calls[0][1] as () => void;
    callback();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
