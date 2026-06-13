import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainWindow from "./MainWindow";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  saveSettings: vi.fn(),
  lookupWord: vi.fn(),
  playAudio: vi.fn(),
  listenForHistoryLookup: vi.fn(),
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
});
