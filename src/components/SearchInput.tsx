import { useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { SearchState, SearchAction } from "../hooks/useSearchMachine";
import { convertHangulToQwerty } from "../lib/koreanKeyboard";
import { isTauriRuntimeAvailable } from "../lib/tauriRuntime";
import { Spinner } from "./ui/spinner";

interface SearchInputProps {
  searchDelay: number;
  clearDelay: number;
  convertKoreanInput: boolean;
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  onSearch: (word: string) => void;
  onClear: () => void;
}

export default function SearchInput({
  searchDelay,
  clearDelay,
  convertKoreanInput,
  state,
  dispatch,
  onSearch,
  onClear,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRemaining = useRef<number>(0);
  const clearTimerStarted = useRef<number>(0);

  // Focus the input element
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Start or restart the auto-clear timer
  const startClearTimer = useCallback(() => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
    }
    clearTimerRemaining.current = clearDelay;
    clearTimerStarted.current = Date.now();
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null;
      clearTimerRemaining.current = 0;
      dispatch({ type: "CLEAR" });
      onClear();
      focusInput();
    }, clearDelay);
  }, [clearDelay, dispatch, onClear, focusInput]);

  // Pause the clear timer (when window loses focus)
  const pauseClearTimer = useCallback(() => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
      const elapsed = Date.now() - clearTimerStarted.current;
      clearTimerRemaining.current = Math.max(
        0,
        clearTimerRemaining.current - elapsed
      );
    }
  }, []);

  // Resume the clear timer (when window regains focus)
  const resumeClearTimer = useCallback(() => {
    if (clearTimerRemaining.current > 0 && !clearTimer.current) {
      clearTimerStarted.current = Date.now();
      clearTimer.current = setTimeout(() => {
        clearTimer.current = null;
        clearTimerRemaining.current = 0;
        dispatch({ type: "CLEAR" });
        onClear();
        focusInput();
      }, clearTimerRemaining.current);
    }
  }, [dispatch, onClear, focusInput]);

  // When status transitions to "displaying", start the auto-clear countdown
  useEffect(() => {
    if (state.status === "displaying") {
      startClearTimer();
    }
    return () => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
      }
    };
  }, [state.status, startClearTimer]);

  // Auto-focus on mount and listen for window focus changes
  useEffect(() => {
    focusInput();

    if (isTauriRuntimeAvailable()) {
      let unlisten: (() => void) | undefined;
      const setup = async () => {
        const appWindow = getCurrentWindow();
        unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
          if (focused) {
            focusInput();
            resumeClearTimer();
          } else {
            pauseClearTimer();
          }
        });
      };
      setup();

      return () => {
        unlisten?.();
      };
    }

    const handleWindowFocus = () => {
      focusInput();
      resumeClearTimer();
    };
    const handleWindowBlur = () => {
      pauseClearTimer();
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [focusInput, resumeClearTimer, pauseClearTimer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = convertKoreanInput
      ? convertHangulToQwerty(e.target.value)
      : e.target.value;
    dispatch({ type: "TYPE", text });

    // Cancel any pending auto-clear when user starts typing again
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
      clearTimerRemaining.current = 0;
    }

    // Reset debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.trim()) {
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        onSearch(text);
      }, searchDelay);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.status === "searching") return;
      if (!state.query.trim()) return;

      // Skip debounce: search immediately
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      onSearch(state.query);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        clearTimer.current = null;
        clearTimerRemaining.current = 0;
      }
      dispatch({ type: "CLEAR" });
      onClear();
    }
  };

  return (
    <div className="w-full px-6 pb-[var(--vb-search-pb)] pt-[var(--vb-search-pt)]">
      <div className="relative w-full" data-testid="search-line">
        <input
          ref={inputRef}
          type="text"
          value={state.query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a word..."
          spellCheck={false}
          autoComplete="off"
          className="w-full border-none bg-transparent px-8 text-center text-[length:var(--vb-search-size)] font-medium text-app-text outline-none caret-app-accent placeholder:text-app-dim"
        />
        {state.status === "searching" && (
          <Spinner
            className="absolute right-0 top-1/2 -translate-y-1/2 text-app-accent"
            data-testid="search-spinner"
          />
        )}
      </div>
      {state.status === "error" && state.error && (
        <p className="mt-3 text-center text-sm text-app-danger">{state.error}</p>
      )}
    </div>
  );
}
