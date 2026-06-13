export const TAURI_RUNTIME_UNAVAILABLE_MESSAGE =
  "This preview is running outside the VocaBridge desktop app, so dictionary lookup is unavailable here. Open the Tauri app to use lookup.";

export function isTauriRuntimeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (
      window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: unknown;
          transformCallback?: unknown;
        };
      }
    ).__TAURI_INTERNALS__?.invoke === "function"
  );
}
