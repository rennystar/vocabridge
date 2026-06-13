import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Settings } from "./types";
import { isTauriRuntimeAvailable } from "./tauriRuntime";

export const HISTORY_LOOKUP_EVENT = "history:lookup";
export const SETTINGS_UPDATED_EVENT = "settings:updated";

export interface HistoryLookupPayload {
  word: string;
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
  focusMain: boolean,
): Promise<void> {
  if (!isTauriRuntimeAvailable()) return Promise.resolve();
  return invoke<void>("request_lookup_from_history", { word, focusMain });
}

export function listenForHistoryLookup(
  handler: (payload: HistoryLookupPayload) => void,
) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<HistoryLookupPayload>(HISTORY_LOOKUP_EVENT, ({ payload }) => {
    handler(payload);
  });
}

export function listenForSettingsUpdates(handler: (settings: Settings) => void) {
  if (!isTauriRuntimeAvailable()) return Promise.resolve(() => {});
  return listen<Settings>(SETTINGS_UPDATED_EVENT, ({ payload }) => {
    handler(payload);
  });
}
