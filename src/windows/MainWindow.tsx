import { useCallback, useEffect, useRef } from "react";
import BottomUtilityRail from "../components/BottomUtilityRail";
import ResultDisplay, {
  findPreferredAudioUrl,
} from "../components/ResultDisplay";
import SearchInput from "../components/SearchInput";
import WindowChromeCap from "../components/WindowChromeCap";
import { useSearchMachine } from "../hooks/useSearchMachine";
import { useSettingsState } from "../hooks/useSettingsState";
import { useWindowShortcuts } from "../hooks/useWindowShortcuts";
import { lookupWord, playAudio } from "../lib/commands";
import type { DictSource } from "../lib/types";
import {
  listenForHistoryLookup,
  listenForHistorySnapshot,
  openHistoryWindow,
  openSettingsWindow,
} from "../lib/windowApi";

export default function MainWindow() {
  const { state: searchState, dispatch } = useSearchMachine();
  const { settings, sources } = useSettingsState();
  const requestIdRef = useRef(0);
  useWindowShortcuts();

  const displayResult = searchState.result ?? searchState.previousResult;

  const handleSearch = useCallback(
    async (word: string, source: DictSource = settings.dictSource) => {
      const trimmed = word.trim();
      if (!trimmed) return;

      const id = ++requestIdRef.current;
      dispatch({ type: "SEARCH" });

      try {
        const entry = await lookupWord(trimmed, source);
        if (id !== requestIdRef.current) return;
        dispatch({ type: "RESULT", entry });
      } catch (err: unknown) {
        if (id !== requestIdRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        dispatch({ type: "ERROR", message });
      }
    },
    [settings.dictSource, dispatch],
  );

  const handleClear = useCallback(() => {
    // SearchInput owns the CLEAR dispatch. MainWindow has no extra side effect.
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    listenForHistoryLookup(({ word, source }) => {
      dispatch({ type: "TYPE", text: word });
      void handleSearch(word, source);
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
  }, [dispatch, handleSearch]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    listenForHistorySnapshot(({ entry }) => {
      dispatch({ type: "TYPE", text: entry.word });
      dispatch({ type: "RESULT", entry, autoPlayAudio: false });
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
  }, [dispatch]);

  const findAudioUrl = useCallback(
    (region: string): string | null => {
      if (!displayResult) return null;
      return findPreferredAudioUrl(displayResult.entries, region);
    },
    [displayResult],
  );

  const alternateRegion =
    settings.preferredRegion.toLowerCase() === "uk" ? "us" : "uk";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && !event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        const url = findAudioUrl(settings.preferredRegion);
        if (url) playAudio(url).catch(() => {});
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        const url = findAudioUrl(alternateRegion);
        if (url) playAudio(url).catch(() => {});
        return;
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [alternateRegion, findAudioUrl, settings.preferredRegion]);

  return (
    <div
      className="h-screen overflow-hidden bg-app-bg text-app-text"
      data-display-size={settings.displaySize}
      data-testid="main-window"
    >
      <div className="flex h-full flex-col">
        <WindowChromeCap />

        <SearchInput
          searchDelay={settings.searchDelay}
          clearDelay={settings.clearDelay}
          convertKoreanInput={settings.convertKoreanInput}
          state={searchState}
          dispatch={dispatch}
          onSearch={handleSearch}
          onClear={handleClear}
        />

        <div className="min-h-0 flex-1">
          <ResultDisplay
            result={displayResult}
            exampleDisplay={settings.exampleDisplay}
            collapseExamples={settings.collapseExamples}
            highlightExampleTerms={settings.highlightExampleTerms}
            autoPlayAudio={settings.autoPlayAudio && searchState.autoPlayResultAudio}
            preferredRegion={settings.preferredRegion}
          />
        </div>

        <BottomUtilityRail
          source={settings.dictSource}
          sources={sources}
          onOpenHistory={() => void openHistoryWindow()}
          onOpenSettings={() => void openSettingsWindow()}
        />
      </div>
    </div>
  );
}
