import type { PropsWithChildren } from "react";
import type { WindowKind } from "../lib/windowKind";

interface AppPreviewFrameProps extends PropsWithChildren {
  kind: WindowKind;
}

const previewSizes: Record<WindowKind, { width: number; height: number }> = {
  main: { width: 500, height: 600 },
  settings: { width: 420, height: 560 },
  history: { width: 420, height: 620 },
};

export default function AppPreviewFrame({
  children,
  kind,
}: AppPreviewFrameProps) {
  if ("__TAURI_INTERNALS__" in window) return <>{children}</>;

  const size = previewSizes[kind];

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center overflow-auto bg-app-bg p-4"
      data-testid="browser-preview-shell"
    >
      <div
        className="browser-preview-window overflow-hidden bg-app-bg"
        data-testid="browser-preview-window"
        style={{ width: size.width, height: size.height }}
      >
        {children}
      </div>
    </div>
  );
}
