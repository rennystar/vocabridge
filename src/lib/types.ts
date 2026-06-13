// TypeScript types mirroring the Rust data model.
// Field names match the serde serialization output from the backend.

export type DictSource = "cambridge" | "free_dictionary";

export interface Pronunciation {
  ipa: string | null;
  audio_url: string | null;
  region: string | null;
}

export interface Sense {
  definition: string;
  examples: string[];
}

export interface DictEntry {
  part_of_speech: string | null;
  pronunciations: Pronunciation[];
  senses: Sense[];
}

export interface WordEntry {
  word: string;
  source: DictSource;
  entries: DictEntry[];
}

export type DisplaySize = "compact" | "default" | "large";

export type ExampleDisplay = "all" | "firstPerMeaning" | "hidden";

export interface Settings {
  displaySize: DisplaySize;
  searchDelay: number;
  clearDelay: number;
  dictSource: DictSource;
  exampleDisplay: ExampleDisplay;
  collapseExamples: boolean;
  highlightExampleTerms: boolean;
  convertKoreanInput: boolean;
  alwaysOnTop: boolean;
  globalHotkey: string;
  autoPlayAudio: boolean;
  preferredRegion: string;
}

export interface HistoryItem {
  cacheKey: string;
  displayWord: string;
  source: string;
  partOfSpeech: string | null;
  definitionPreview: string | null;
  lookupCount: number;
  lookedUpAt: string;
}

export type ExportFormat = "csv" | "json";
