import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DictSource, Settings, WordEntry } from "./types";
import { isTauriRuntimeAvailable } from "./tauriRuntime";

export const HISTORY_LOOKUP_EVENT = "history:lookup";
export const HISTORY_SNAPSHOT_EVENT = "history:snapshot";
export const HISTORY_UPDATED_EVENT = "history:updated";
export const SETTINGS_UPDATED_EVENT = "settings:updated";

export interface HistoryLookupPayload {
  word: string;
  source: DictSource;
  focusMain: boolean;
}

export interface HistorySnapshotPayload {
  entry: WordEntry;
  focusMain: boolean;
}

export function openSettingsWindow(): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("open_settings_window");
}

export function closeSettingsWindow(): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("close_settings_window");
}

export function openHistoryWindow(): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("open_history_window");
}

export function closeHistoryWindow(): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("close_history_window");
}

export function requestLookupFromHistory(
  word: string,
  source: DictSource,
  focusMain: boolean,
): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("request_lookup_from_history", {
    word,
    source,
    focusMain,
  });
}

export function requestSnapshotFromHistory(
  cacheKey: string,
  source: DictSource,
  focusMain: boolean,
): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("request_snapshot_from_history", {
    cacheKey,
    source,
    focusMain,
  });
}

export function listenForHistoryLookup(
  handler: (payload: HistoryLookupPayload) => void,
) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<HistoryLookupPayload>(HISTORY_LOOKUP_EVENT, ({ payload }) => {
    handler(payload);
  });
}

export function listenForHistorySnapshot(
  handler: (payload: HistorySnapshotPayload) => void,
) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<HistorySnapshotPayload>(HISTORY_SNAPSHOT_EVENT, ({ payload }) => {
    handler(payload);
  });
}

export function listenForHistoryUpdates(handler: () => void) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<void>(HISTORY_UPDATED_EVENT, () => {
    handler();
  });
}

export function listenForSettingsUpdates(handler: (settings: Settings) => void) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<Settings>(SETTINGS_UPDATED_EVENT, ({ payload }) => {
    handler(payload);
  });
}
