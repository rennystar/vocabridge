export type WindowKind = "main" | "settings" | "history";

export function resolveWindowKind(href: string): WindowKind {
  const url = new URL(href);
  const value = url.searchParams.get("window");
  if (value === "settings" || value === "history") return value;
  return "main";
}

export function currentWindowKind(): WindowKind {
  return resolveWindowKind(window.location.href);
}
