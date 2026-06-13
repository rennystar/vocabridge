import { useEffect } from "react";
import { openHistoryWindow, openSettingsWindow } from "../lib/windowApi";

interface WindowShortcutOptions {
  onEscape?: () => void;
}

export function useWindowShortcuts(options: WindowShortcutOptions = {}) {
  const { onEscape } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && !event.shiftKey && event.key === ",") {
        event.preventDefault();
        void openSettingsWindow();
        return;
      }

      if (mod && !event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        void openHistoryWindow();
        return;
      }

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);
}
