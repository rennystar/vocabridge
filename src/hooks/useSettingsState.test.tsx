import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsState } from "./useSettingsState";
import type { Settings } from "../lib/types";

const defaultSettings: Settings = {
  displaySize: "default",
  searchDelay: 1000,
  clearDelay: 3000,
  dictSource: "free_dictionary",
  historyClickBehavior: "savedSnapshot",
  exampleDisplay: "all",
  collapseExamples: false,
  highlightExampleTerms: true,
  convertKoreanInput: true,
  alwaysOnTop: false,
  globalHotkey: "CmdOrCtrl+Shift+D",
  autoPlayAudio: true,
  preferredRegion: "uk",
};

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getAvailableSources: vi.fn(),
  listenForSettingsUpdates: vi.fn(),
}));

vi.mock("../lib/commands", () => ({
  getSettings: () => mocks.getSettings(),
  updateSettings: (settings: Settings) => mocks.updateSettings(settings),
  getAvailableSources: () => mocks.getAvailableSources(),
}));

vi.mock("../lib/windowApi", () => ({
  listenForSettingsUpdates: (handler: (settings: Settings) => void) =>
    mocks.listenForSettingsUpdates(handler),
}));

describe("useSettingsState", () => {
  beforeEach(() => {
    mocks.getSettings.mockResolvedValue(defaultSettings);
    mocks.updateSettings.mockResolvedValue(undefined);
    mocks.getAvailableSources.mockResolvedValue(["free_dictionary", "cambridge"]);
    mocks.listenForSettingsUpdates.mockResolvedValue(() => {});
    vi.clearAllMocks();
  });

  it("loads settings and available sources", async () => {
    const { result } = renderHook(() => useSettingsState());

    await waitFor(() => {
      expect(result.current.settings).toEqual(defaultSettings);
      expect(result.current.sources).toEqual(["free_dictionary", "cambridge"]);
    });
  });

  it("keeps both dictionary sources available when the source command is unavailable", async () => {
    mocks.getAvailableSources.mockRejectedValue(new Error("missing Tauri API"));

    const { result } = renderHook(() => useSettingsState());

    await waitFor(() => {
      expect(result.current.sources).toEqual(["free_dictionary", "cambridge"]);
    });
  });

  it("persists updates through updateSettings", async () => {
    const { result } = renderHook(() => useSettingsState());
    await waitFor(() => {
      expect(result.current.sources).toEqual(["free_dictionary", "cambridge"]);
    });

    const next = { ...defaultSettings, dictSource: "cambridge" as const };
    await act(async () => {
      await result.current.saveSettings(next);
    });

    expect(mocks.updateSettings).toHaveBeenCalledWith(next);
  });

  it("rolls back optimistic settings when persistence fails", async () => {
    mocks.updateSettings.mockRejectedValue(new Error("invalid shortcut"));
    const { result } = renderHook(() => useSettingsState());
    await waitFor(() => {
      expect(result.current.settings).toEqual(defaultSettings);
    });

    const next = { ...defaultSettings, globalHotkey: "CmdOrCtrl+Shift+J" };
    await act(async () => {
      await result.current.saveSettings(next).catch(() => {});
    });

    expect(mocks.updateSettings).toHaveBeenCalledWith(next);
    expect(result.current.settings).toEqual(defaultSettings);
  });
});
