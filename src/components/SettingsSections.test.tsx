import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Settings } from "../lib/types";
import SettingsSections from "./SettingsSections";

const settings: Settings = {
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
};

describe("SettingsSections", () => {
  it("renders Appearance, Lookup, Results, Audio, and Window sections", () => {
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lookup" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Results" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Audio" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Window" })).toBeTruthy();
  });

  it("uses low-contrast grouped sections for a softer settings hierarchy", () => {
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={vi.fn()}
      />,
    );

    const appearanceHeading = screen.getByRole("heading", {
      name: "Appearance",
    });
    const appearanceGroup = appearanceHeading.nextElementSibling;

    expect(appearanceHeading.className).toContain("text-app-muted/80");
    expect(appearanceGroup?.className).toContain("border-app-border/50");
    expect(appearanceGroup?.className).toContain("bg-app-panel/60");
  });

  it("reports display size updates from the Appearance presets", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Large" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      displaySize: "large",
    });
  });

  it("keeps dictionary source inside settings as the default lookup source", () => {
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Default dictionary" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Dictionary source" }),
    ).toBeNull();
  });

  it("reports example display updates", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Examples" }));
    fireEvent.click(screen.getByRole("option", { name: "First example per meaning" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      exampleDisplay: "firstPerMeaning",
    });
  });

  it("reports delay preset updates from toggle groups", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Fast 0.8s" }));
    fireEvent.click(screen.getByRole("radio", { name: "Long 5s" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      searchDelay: 800,
    });
    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      clearDelay: 5000,
    });
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("reports collapse example updates from the switch", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Collapse examples" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      collapseExamples: true,
    });
    expect(screen.queryByLabelText("Max examples")).toBeNull();
    expect(
      screen.queryByRole("checkbox", { name: "Collapse examples" }),
    ).toBeNull();
  });

  it("reports example highlight updates from the switch", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Highlight search term" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      highlightExampleTerms: false,
    });
  });

  it("reports Korean keyboard conversion updates from the switch", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Convert Korean layout" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      convertKoreanInput: false,
    });
  });

  it("records a new global hotkey from a physical keyboard chord", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change shortcut" }));
    fireEvent.keyDown(screen.getByTestId("hotkey-recorder"), {
      code: "KeyJ",
      key: "Dead",
      metaKey: true,
      shiftKey: true,
    });

    expect(onUpdate).toHaveBeenCalledWith({
      ...settings,
      globalHotkey: "CmdOrCtrl+Shift+J",
    });
  });

  it("resets the global hotkey to the default shortcut", () => {
    const onUpdate = vi.fn();
    const customSettings = {
      ...settings,
      globalHotkey: "CmdOrCtrl+Alt+K",
    };
    render(
      <SettingsSections
        settings={customSettings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset shortcut" }));

    expect(onUpdate).toHaveBeenCalledWith({
      ...customSettings,
      globalHotkey: "CmdOrCtrl+Shift+D",
    });
  });

  it("cancels recording when focus leaves the hotkey recorder", () => {
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={vi.fn()}
      />,
    );

    const recorder = screen.getByTestId("hotkey-recorder");
    fireEvent.click(screen.getByRole("button", { name: "Change shortcut" }));
    expect(recorder.textContent).toContain("Press shortcut");

    fireEvent.blur(recorder, { relatedTarget: document.body });

    expect(recorder.textContent).toContain("CmdOrCtrl+Shift+D");
  });

  it("cancels recording when the window loses focus", () => {
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={vi.fn()}
      />,
    );

    const recorder = screen.getByTestId("hotkey-recorder");
    fireEvent.click(screen.getByRole("button", { name: "Change shortcut" }));
    expect(recorder.textContent).toContain("Press shortcut");

    fireEvent(window, new Event("blur"));

    expect(recorder.textContent).toContain("CmdOrCtrl+Shift+D");
  });

  it("ignores modifier-only input while recording", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    const recorder = screen.getByTestId("hotkey-recorder");
    fireEvent.click(screen.getByRole("button", { name: "Change shortcut" }));
    fireEvent.keyDown(recorder, { key: "Shift", shiftKey: true });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(recorder.textContent).toContain("Press shortcut");
  });

  it("cancels recording with Escape without saving a shortcut", () => {
    const onUpdate = vi.fn();
    render(
      <SettingsSections
        settings={settings}
        availableSources={["free_dictionary", "cambridge"]}
        onUpdate={onUpdate}
      />,
    );

    const recorder = screen.getByTestId("hotkey-recorder");
    fireEvent.click(screen.getByRole("button", { name: "Change shortcut" }));
    fireEvent.keyDown(recorder, { key: "Escape" });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(recorder.textContent).toContain("CmdOrCtrl+Shift+D");
  });
});
