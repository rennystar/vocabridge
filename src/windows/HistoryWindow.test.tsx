import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryWindow from "./HistoryWindow";

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
  clearHistory: vi.fn(),
  exportHistory: vi.fn(),
  closeHistoryWindow: vi.fn(),
  requestLookupFromHistory: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../lib/commands", () => ({
  getHistory: () => mocks.getHistory(),
  clearHistory: () => mocks.clearHistory(),
  exportHistory: (...args: unknown[]) => mocks.exportHistory(...args),
}));

vi.mock("../lib/windowApi", () => ({
  closeHistoryWindow: () => mocks.closeHistoryWindow(),
  requestLookupFromHistory: (word: string, focusMain: boolean) =>
    mocks.requestLookupFromHistory(word, focusMain),
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
        source: "free-dict",
        partOfSpeech: "noun",
        definitionPreview: "a structure carrying a road over water",
        lookupCount: 2,
        lookedUpAt: "2026-04-26 00:00:00",
      },
    ]);
    mocks.clearHistory.mockResolvedValue(undefined);
    mocks.closeHistoryWindow.mockResolvedValue(undefined);
    mocks.requestLookupFromHistory.mockResolvedValue(undefined);
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

  it("clicks an item without focusing main", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    await screen.findByRole("button", { name: /bridge/i });
    await user.click(screen.getByRole("button", { name: /bridge/i }));

    expect(mocks.requestLookupFromHistory).toHaveBeenCalledWith(
      "bridge",
      false,
    );
  });

  it("uses Cmd/Ctrl+Enter to request main focus", async () => {
    const user = userEvent.setup();
    render(<HistoryWindow />);

    const item = await screen.findByRole("button", { name: /bridge/i });
    item.focus();
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    await waitFor(() => {
      expect(mocks.requestLookupFromHistory).toHaveBeenCalledWith(
        "bridge",
        true,
      );
    });
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
          source: "free-dict",
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
