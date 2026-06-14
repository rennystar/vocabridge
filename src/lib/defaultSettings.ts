import type { DictSource, Settings } from "./types";

export const DEFAULT_GLOBAL_HOTKEY = "CmdOrCtrl+Shift+D";

export const DEFAULT_SETTINGS: Settings = {
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
  globalHotkey: DEFAULT_GLOBAL_HOTKEY,
  autoPlayAudio: true,
  preferredRegion: "uk",
};

export const FALLBACK_SOURCES: DictSource[] = [
  "free_dictionary",
  "cambridge",
];
