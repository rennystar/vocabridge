import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainWindow from "./MainWindow";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  saveSettings: vi.fn(),
  lookupWord: vi.fn(),
  playAudio: vi.fn(),
  listenForHistoryLookup: vi.fn(),
  listenForHistorySnapshot: vi.fn(),
  openHistoryWindow: vi.fn(),
  openSettingsWindow: vi.fn(),
}));

vi.mock("../hooks/useSearchMachine", () => ({
  useSearchMachine: () => ({
    state: {
      status: "idle",
      query: "",
      result: null,
      error: null,
      previousResult: null,
      autoPlayResultAudio: true,
    },
    dispatch: mocks.dispatch,
  }),
}));

vi.mock("../hooks/useSettingsState", () => ({
  useSettingsState: () => ({
    settings: {
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
    },
    sources: ["free_dictionary", "cambridge"],
    saveSettings: mocks.saveSettings,
  }),
}));

vi.mock("../hooks/useWindowShortcuts", () => ({
  useWindowShortcuts: vi.fn(),
}));

vi.mock("../lib/commands", () => ({
  lookupWord: (...args: unknown[]) => mocks.lookupWord(...args),
  playAudio: (...args: unknown[]) => mocks.playAudio(...args),
}));

vi.mock("../lib/windowApi", () => ({
  listenForHistoryLookup: (...args: unknown[]) =>
    mocks.listenForHistoryLookup(...args),
  listenForHistorySnapshot: (...args: unknown[]) =>
    mocks.listenForHistorySnapshot(...args),
  openHistoryWindow: () => mocks.openHistoryWindow(),
  openSettingsWindow: () => mocks.openSettingsWindow(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onFocusChanged: vi.fn().mockResolvedValue(vi.fn()),
  }),
}));

describe("MainWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listenForHistoryLookup.mockResolvedValue(vi.fn());
    mocks.listenForHistorySnapshot.mockResolvedValue(vi.fn());
    mocks.openHistoryWindow.mockResolvedValue(undefined);
    mocks.openSettingsWindow.mockResolvedValue(undefined);
  });

  it("keeps the search input ahead of passive utility controls", () => {
    render(<MainWindow />);

    const searchInput = screen.getByPlaceholderText("Type a word...");
    const sourceIndicator = screen.getByTestId("source-indicator");

    expect(screen.getByTestId("app-identity")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      searchInput.compareDocumentPosition(sourceIndicator) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("applies the configured display size to the main window", () => {
    render(<MainWindow />);

    expect(screen.getByTestId("main-window").getAttribute("data-display-size"))
      .toBe("default");
  });

  it("opens auxiliary windows from bottom utility actions", async () => {
    const user = userEvent.setup();
    render(<MainWindow />);

    await user.click(screen.getByRole("button", { name: "Open history" }));
    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(mocks.openHistoryWindow).toHaveBeenCalledTimes(1);
    expect(mocks.openSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("uses the original history source when replaying a lookup", async () => {
    let historyLookupHandler:
      | ((payload: { word: string; source: "cambridge"; focusMain: boolean }) => void)
      | undefined;
    mocks.listenForHistoryLookup.mockImplementation((handler) => {
      historyLookupHandler = handler;
      return Promise.resolve(vi.fn());
    });
    mocks.lookupWord.mockResolvedValue({
      word: "bridge",
      source: "cambridge",
      entries: [],
    });

    render(<MainWindow />);

    await waitFor(() => expect(historyLookupHandler).toBeDefined());
    await act(async () => {
      historyLookupHandler?.({
        word: "bridge",
        source: "cambridge",
        focusMain: false,
      });
    });

    expect(mocks.lookupWord).toHaveBeenCalledWith("bridge", "cambridge");
  });

  it("displays saved history snapshots without requesting the dictionary", async () => {
    let snapshotHandler:
      | ((payload: {
          entry: { word: string; source: "cambridge"; entries: [] };
          focusMain: boolean;
        }) => void)
      | undefined;
    mocks.listenForHistorySnapshot.mockImplementation((handler) => {
      snapshotHandler = handler;
      return Promise.resolve(vi.fn());
    });

    render(<MainWindow />);

    await waitFor(() => expect(snapshotHandler).toBeDefined());
    await act(async () => {
      snapshotHandler?.({
        entry: { word: "bridge", source: "cambridge", entries: [] },
        focusMain: false,
      });
    });

    expect(mocks.lookupWord).not.toHaveBeenCalled();
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "TYPE",
      text: "bridge",
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "RESULT",
      entry: { word: "bridge", source: "cambridge", entries: [] },
      autoPlayAudio: false,
    });
  });

  it("cleans up a pending history listener when registration finishes after unmount", async () => {
    let resolveListener:
      | ((cleanup: () => void) => void)
      | undefined;
    const cleanup = vi.fn();
    mocks.listenForHistoryLookup.mockImplementation(
      () =>
        new Promise<() => void>((resolve) => {
          resolveListener = resolve;
        }),
    );

    const { unmount } = render(<MainWindow />);

    unmount();

    await act(async () => {
      resolveListener?.(cleanup);
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
