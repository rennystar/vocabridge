import { useRef } from "react";
import logoUrl from "../assets/images/logo-mark.png";
import { SOURCE_LABELS } from "../lib/sourceLabels";
import type { DictSource } from "../lib/types";
import { Button } from "./ui/button";
import { HistoryIcon, type HistoryIconHandle } from "./ui/history-icon";
import { SettingsIcon, type SettingsIconHandle } from "./ui/settings-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface BottomUtilityRailProps {
  source: DictSource;
  sources: DictSource[];
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export default function BottomUtilityRail({
  source,
  sources,
  onOpenHistory,
  onOpenSettings,
}: BottomUtilityRailProps) {
  const historyIconRef = useRef<HistoryIconHandle>(null);
  const settingsIconRef = useRef<SettingsIconHandle>(null);

  return (
    <footer
      className="shrink-0 bg-gradient-to-t from-app-bg via-app-bg/95 to-app-bg/80 px-3 pb-2 pt-1"
      data-testid="bottom-utility-rail"
    >
      <div className="relative flex h-9 items-center justify-between gap-2">
        <div
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-app-dim/80"
          data-testid="app-identity"
        >
          <img
            src={logoUrl}
            alt="VocaBridge logo"
            className="size-4 rounded-[3px]"
          />
          <span className="text-xs font-medium tracking-normal">
            VocaBridge
          </span>
        </div>

        <div className="min-w-0">
          {sources.length > 1 && (
            <div
              className="flex h-8 max-w-[140px] items-center rounded-full border border-transparent bg-app-text/[0.025] px-3 text-xs font-medium text-app-muted"
              data-testid="source-indicator"
              aria-label={`Current dictionary: ${SOURCE_LABELS[source].compact}`}
            >
              <span className="truncate">{SOURCE_LABELS[source].compact}</span>
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={150} skipDelayDuration={0}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="quietIcon"
                  size="quietIcon"
                  className="rounded-full text-app-dim/90 hover:bg-app-text/[0.045] hover:text-app-text"
                  onMouseEnter={() => historyIconRef.current?.startAnimation()}
                  onMouseLeave={() => historyIconRef.current?.stopAnimation()}
                  onClick={onOpenHistory}
                  aria-label="Open history"
                >
                  <HistoryIcon ref={historyIconRef} data-testid="history-icon" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">History</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="quietIcon"
                  size="quietIcon"
                  className="rounded-full text-app-dim/90 hover:bg-app-text/[0.045] hover:text-app-text"
                  onMouseEnter={() => settingsIconRef.current?.startAnimation()}
                  onMouseLeave={() => settingsIconRef.current?.stopAnimation()}
                  onClick={onOpenSettings}
                  aria-label="Open settings"
                >
                  <SettingsIcon
                    ref={settingsIconRef}
                    data-testid="settings-icon"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Settings</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </footer>
  );
}
