import { invoke } from "@tauri-apps/api/core";
import type {
  DictSource,
  WordEntry,
  HistoryItem,
  ExportFormat,
  Settings,
} from "./types";
import {
  isTauriRuntimeAvailable,
  TAURI_RUNTIME_UNAVAILABLE_MESSAGE,
} from "./tauriRuntime";

export { TAURI_RUNTIME_UNAVAILABLE_MESSAGE };

function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(TAURI_RUNTIME_UNAVAILABLE_MESSAGE));
  }

  return invoke<T>(command, args);
}

export async function lookupWord(
  word: string,
  source?: DictSource
): Promise<WordEntry> {
  return invokeCommand<WordEntry>("lookup_word", { word, source: source ?? null });
}

export async function playAudio(url: string): Promise<void> {
  return invokeCommand<void>("play_audio", { url });
}

export async function getAvailableSources(): Promise<DictSource[]> {
  return invokeCommand<DictSource[]>("get_available_sources");
}

export async function getHistory(): Promise<HistoryItem[]> {
  return invokeCommand<HistoryItem[]>("get_history");
}

export async function clearHistory(): Promise<void> {
  return invokeCommand<void>("clear_history");
}

export async function exportHistory(
  format: ExportFormat,
  path: string
): Promise<void> {
  return invokeCommand<void>("export_history", { format, path });
}

export async function getSettings(): Promise<Settings> {
  return invokeCommand<Settings>("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invokeCommand<void>("update_settings", { settings });
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  return invokeCommand<void>("set_always_on_top", { enabled });
}
