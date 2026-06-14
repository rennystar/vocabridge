import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryWindow from "./HistoryWindow";

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
  clearHistory: vi.fn(),
  exportHistory: vi.fn(),
  closeHistoryWindow: vi.fn(),
  requestLookupFromHistory: vi.fn(),
  requestSnapshotFromHistory: vi.fn(),
  listenForHistoryUpdates: vi.fn(),
  save: vi.fn(),
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
}));

vi.mock("../lib/commands", () => ({
  getHistory: () => mocks.getHistory(),
  clearHistory: () => mocks.clearHistory(),
  exportHistory: (...args: unknown[]) => mocks.exportHistory(...args),
}));

vi.mock("../lib/windowApi", () => ({
  closeHistoryWindow: () => mocks.closeHistoryWindow(),
  requestLookupFromHistory: (word: string, source: string, focusMain: boolean) =>
    mocks.requestLookupFromHistory(word, source, focusMain),
  requestSnapshotFromHistory: (
    cacheKey: string,
    source: string,
    focusMain: boolean,
  ) => mocks.requestSnapshotFromHistory(cacheKey, source, focusMain),
  listenForHistoryUpdates: (handler: () => void) =>
    mocks.listenForHistoryUpdates(handler),
}));

vi.mock("../hooks/useSettingsState", () => ({
  useSettingsState: () => ({
    settings: mocks.settings,
    sources: ["free_dictionary", "cambridge"],
    saveSettings: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mocks.save(...args),
}));

describe("HistoryWindow", () => {
  beforeEach(() => {
    mocks.getHistory.mockResolvedValue([
      {
        cacheKey: "bridge",
        displayWord: "bridge",
        source: "free_dictionary",
        partOfSpeech: "noun",
        definitionPreview: "a structure carrying a road over water",
        lookupCount: 2,
        lookedUpAt: "2026-04-26 00:00:00",
      },
    ]);
    mocks.clearHistory.mockResolvedValue(undefined);
    mocks.closeHistoryWindow.mockResolvedValue(undefined);
    mocks.requestLookupFromHistory.mockResolvedValue(undefined);
    mocks.requestSnapshotFromHistory.mockResolvedValue(undefined);
    mocks.listenForHistoryUpdates.mockResolvedValue(vi.fn());
    mocks.settings.historyClickBehavior = "savedSnapshot";
    vi.clearAllMocks();
  });

  it("renders a utility-panel heading with an in-content close button", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close history" }));

    expect(mocks.closeHistoryWindow).toHaveBeenCalledTimes(1);
    await screen.findByRole("button", { name: /bridge/i });
  });

  it("clicks an item using the saved snapshot by default", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    await user.click(screen.getByRole("button", { name: /bridge/i }));

    expect(mocks.requestSnapshotFromHistory).toHaveBeenCalledWith(
      "bridge",
      "free_dictionary",
      false,
    );
    expect(mocks.requestLookupFromHistory).not.toHaveBeenCalled();
  });

  it("refreshes from the dictionary when configured", async () => {
    mocks.settings.historyClickBehavior = "refreshFromDictionary";
    const user = userEvent.setup();
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    await user.click(screen.getByRole("button", { name: /bridge/i }));

    expect(mocks.requestLookupFromHistory).toHaveBeenCalledWith(
      "bridge",
      "free_dictionary",
      false,
    );
    expect(mocks.requestSnapshotFromHistory).not.toHaveBeenCalled();
  });

  it("uses Cmd/Ctrl+Enter to request main focus", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    const item = await screen.findByRole("button", { name: /bridge/i });
    item.focus();
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    await waitFor(() => {
      expect(mocks.requestSnapshotFromHistory).toHaveBeenCalledWith(
        "bridge",
        "free_dictionary",
        true,
      );
    });
  });

  it("reloads when another lookup updates history", async () => {
    let historyUpdatedHandler: (() => void) | undefined;
    mocks.listenForHistoryUpdates.mockImplementation((handler) => {
      historyUpdatedHandler = handler;
      return Promise.resolve(vi.fn());
    });
    mocks.getHistory
      .mockResolvedValueOnce([
        {
          cacheKey: "bridge",
          displayWord: "bridge",
          source: "free_dictionary",
          partOfSpeech: "noun",
          definitionPreview: "a structure carrying a road over water",
          lookupCount: 2,
          lookedUpAt: "2026-04-26 00:00:00",
        },
      ])
      .mockResolvedValueOnce([
        {
          cacheKey: "canteen",
          displayWord: "canteen",
          source: "cambridge",
          partOfSpeech: "noun",
          definitionPreview: "a place where food and drink are served",
          lookupCount: 1,
          lookedUpAt: "2026-06-14 00:00:00",
        },
        {
          cacheKey: "bridge",
          displayWord: "bridge",
          source: "free_dictionary",
          partOfSpeech: "noun",
          definitionPreview: "a structure carrying a road over water",
          lookupCount: 2,
          lookedUpAt: "2026-04-26 00:00:00",
        },
      ]);

    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    expect(historyUpdatedHandler).toBeDefined();

    historyUpdatedHandler?.();

    await waitFor(() => expect(mocks.getHistory).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: /canteen/i })).toBeTruthy();
  });

  it("cleans up a pending update listener when registration finishes after unmount", async () => {
    let resolveListener:
      | ((cleanup: () => void) => void)
      | undefined;
    const cleanup = vi.fn();
    mocks.listenForHistoryUpdates.mockImplementation(
      () =>
        new Promise<() => void>((resolve) => {
          resolveListener = resolve;
        }),
    );

    const { unmount } = render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    unmount();

    await act(async () => {
      resolveListener?.(cleanup);
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("closes from Escape", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    await user.keyboard("{Escape}");

    expect(mocks.closeHistoryWindow).toHaveBeenCalledTimes(1);
  });

  it("shows a single low-emphasis CSV export action", async () => {
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export JSON" })).toBeNull();
  });

  it("keeps the title and filter visually grouped behind one divider", async () => {
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });

    expect(screen.getByRole("banner").className).not.toContain("border-b");
    expect(screen.getByTestId("history-filter-bar").className).toContain(
      "border-b",
    );
  });

  it("asks for confirmation before clearing history", async () => {
    mocks.getHistory
      .mockResolvedValueOnce([
        {
          cacheKey: "bridge",
          displayWord: "bridge",
          source: "free_dictionary",
          partOfSpeech: "noun",
          definitionPreview: "a structure carrying a road over water",
          lookupCount: 2,
          lookedUpAt: "2026-04-26 00:00:00",
        },
      ])
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    await user.click(screen.getByRole("button", { name: "Clear history" }));

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByRole("heading", { name: "Clear all history?" }),
    ).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Clear history" }));

    await waitFor(() => {
      expect(mocks.clearHistory).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("No history yet")).toBeTruthy();
  });
});
