import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../lib/types";
import SettingsWindow from "./SettingsWindow";

const settings: Settings = {
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
  saveSettings: vi.fn(),
  closeSettingsWindow: vi.fn(),
}));

vi.mock("../hooks/useSettingsState", () => ({
  useSettingsState: () => ({
    settings,
    sources: ["free_dictionary", "cambridge"],
    saveSettings: mocks.saveSettings,
  }),
}));

vi.mock("../lib/windowApi", () => ({
  closeSettingsWindow: () => mocks.closeSettingsWindow(),
}));

describe("SettingsWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.closeSettingsWindow.mockResolvedValue(undefined);
  });

  it("renders a utility-panel heading with an in-content close button", async () => {
    const user = userEvent.setup();
    render(<SettingsWindow />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(mocks.closeSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("keeps the settings header visually connected to the first section", () => {
    render(<SettingsWindow />);

    const heading = screen.getByRole("heading", { name: "Settings" });
    const header = heading.closest("header");
    const content = screen.getByTestId("settings-content");

    expect(header?.className).not.toContain("border-b");
    expect(content.className).toContain("pt-2");
  });
});
