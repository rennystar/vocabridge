import type { PropsWithChildren } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface AuxiliaryWindowFrameProps extends PropsWithChildren {
  title: string;
  closeLabel: string;
  onClose: () => void;
  showHeaderDivider?: boolean;
}

export default function AuxiliaryWindowFrame({
  title,
  closeLabel,
  onClose,
  showHeaderDivider = true,
  children,
}: AuxiliaryWindowFrameProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-bg text-app-text">
      <header
        className={cn(
          "flex h-11 shrink-0 items-center gap-3 bg-app-bg/95 pl-4 pr-2",
          showHeaderDivider && "border-b border-app-border/45",
        )}
      >
        <div
          className="flex min-w-0 flex-1 items-center self-stretch"
          data-tauri-drag-region="true"
        >
          <h1 className="text-xs font-medium uppercase tracking-normal text-app-muted">
            {title}
          </h1>
        </div>
        <Button
          type="button"
          variant="quietIcon"
          size="quietIcon"
          className="size-7 rounded-full text-app-dim hover:bg-app-text/[0.055] hover:text-app-text"
          onClick={onClose}
          aria-label={closeLabel}
          title="Close"
        >
          <X className="size-3.5" />
        </Button>
      </header>

      {children}
    </div>
  );
}
