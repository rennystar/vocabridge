import { useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Download, Search, Trash2 } from "lucide-react";
import AuxiliaryWindowFrame from "../components/AuxiliaryWindowFrame";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { useWindowShortcuts } from "../hooks/useWindowShortcuts";
import { clearHistory, exportHistory, getHistory } from "../lib/commands";
import type { ExportFormat, HistoryItem } from "../lib/types";
import { closeHistoryWindow, requestLookupFromHistory } from "../lib/windowApi";

export default function HistoryWindow() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  useWindowShortcuts({
    onEscape: () => void closeHistoryWindow(),
  });

  async function loadHistory() {
    setLoading(true);
    try {
      setItems(await getHistory());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return items;
    return items.filter((item) =>
      item.displayWord.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [filter, items]);

  async function activateItem(word: string, focusMain: boolean) {
    await requestLookupFromHistory(word, focusMain);
    await loadHistory();
  }

  async function handleExport(format: ExportFormat = "csv") {
    const ext = format === "csv" ? "csv" : "json";
    const filterName = format === "csv" ? "CSV files" : "JSON files";

    try {
      setExporting(true);
      const path = await save({
        defaultPath: `vocabridge-history.${ext}`,
        filters: [{ name: filterName, extensions: [ext] }],
      });
      if (path === null) return;
      await exportHistory(format, path);
    } finally {
      setExporting(false);
    }
  }

  async function handleClearHistory() {
    try {
      setClearing(true);
      await clearHistory();
      setFilter("");
      await loadHistory();
    } catch (err) {
      setError(String(err));
    } finally {
      setClearing(false);
    }
  }

  return (
    <AuxiliaryWindowFrame
      title="History"
      closeLabel="Close history"
      onClose={() => void closeHistoryWindow()}
      showHeaderDivider={false}
    >
      <div
        data-testid="history-filter-bar"
        className="border-b border-app-border/45 px-4 pb-3 pt-1"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-app-dim" />
          <input
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter history..."
            className="h-9 w-full rounded-md border border-app-border bg-app-panel pl-8 pr-3 text-sm text-app-text outline-none placeholder:text-app-dim focus:ring-1 focus:ring-app-accent"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && (
          <p className="px-4 py-8 text-center text-sm text-app-dim">
            Loading...
          </p>
        )}

        {error && (
          <p className="px-4 py-8 text-center text-sm text-app-danger">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-app-dim">
            {filter ? "No matching entries" : "No history yet"}
          </p>
        )}

        {!loading &&
          !error &&
          filtered.map((item) => (
            <button
              key={`${item.cacheKey}-${item.source}`}
              type="button"
              onClick={() => void activateItem(item.displayWord, false)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void activateItem(
                  item.displayWord,
                  event.metaKey || event.ctrlKey,
                );
              }}
              className="w-full border-b border-app-border px-4 py-3 text-left transition-colors hover:bg-app-panel focus:bg-app-panel-2 focus:outline-none"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-app-text">
                      {item.displayWord}
                    </span>
                    {item.partOfSpeech && (
                      <span className="shrink-0 text-xs italic text-app-accent">
                        {item.partOfSpeech}
                      </span>
                    )}
                  </div>
                  {item.definitionPreview && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-app-muted">
                      {item.definitionPreview}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {item.lookupCount > 1 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-accent/10 px-1.5 text-xs font-medium text-app-accent">
                      {item.lookupCount}
                    </span>
                  )}
                  <span className="whitespace-nowrap text-xs text-app-dim">
                    {relativeTime(item.lookedUpAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
      </ScrollArea>

      <div className="shrink-0 bg-gradient-to-t from-app-bg via-app-bg/95 to-app-bg/80 px-3 pb-2 pt-1">
        <div className="flex h-9 items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="quietIcon"
                disabled={loading || clearing || items.length === 0}
                className="h-8 rounded-full px-3 text-xs font-medium text-app-muted hover:bg-app-danger/10 hover:text-app-danger disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
                Clear history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every saved lookup and cached result. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleClearHistory()}>
                  Clear history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            type="button"
            variant="quietIcon"
            onClick={() => void handleExport()}
            disabled={exporting || items.length === 0}
            className="h-8 rounded-full px-3 text-xs font-medium text-app-muted hover:bg-app-text/[0.045] hover:text-app-text disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>
    </AuxiliaryWindowFrame>
  );
}

function relativeTime(isoOrSqlite: string): string {
  const normalized = isoOrSqlite.includes("T")
    ? isoOrSqlite
    : `${isoOrSqlite.replace(" ", "T")}Z`;

  const then = new Date(normalized).getTime();
  if (Number.isNaN(then)) return isoOrSqlite;

  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
