import { useCallback, useEffect, useState } from "react";
import {
  getAvailableSources,
  getSettings,
  updateSettings,
} from "../lib/commands";
import { DEFAULT_SETTINGS, FALLBACK_SOURCES } from "../lib/defaultSettings";
import type { DictSource, Settings } from "../lib/types";
import { listenForSettingsUpdates } from "../lib/windowApi";

export { DEFAULT_SETTINGS, FALLBACK_SOURCES } from "../lib/defaultSettings";

export function useSettingsState() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sources, setSources] = useState<DictSource[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([getSettings(), getAvailableSources()]).then(
      ([settingsResult, sourcesResult]) => {
        if (cancelled) return;

        if (settingsResult.status === "fulfilled") {
          setSettings(settingsResult.value);
        }

        if (sourcesResult.status === "fulfilled") {
          setSources(sourcesResult.value);
        } else {
          setSources(FALLBACK_SOURCES);
        }

      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    listenForSettingsUpdates((nextSettings) => {
      setSettings(nextSettings);
    }).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        unlisten = cleanup;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const saveSettings = useCallback(
    async (nextSettings: Settings) => {
      const previousSettings = settings;
      setSettings(nextSettings);

      try {
        await updateSettings(nextSettings);
      } catch {
        setSettings(previousSettings);
      }
    },
    [settings],
  );

  return {
    settings,
    sources,
    saveSettings,
  } as const;
}
