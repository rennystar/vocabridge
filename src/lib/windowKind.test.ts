import { describe, expect, it } from "vitest";
import { resolveWindowKind } from "./windowKind";

describe("resolveWindowKind", () => {
  it("defaults to main", () => {
    expect(resolveWindowKind("tauri://localhost/index.html")).toBe("main");
  });

  it("recognizes settings and history query values", () => {
    expect(resolveWindowKind("tauri://localhost/index.html?window=settings")).toBe(
      "settings",
    );
    expect(resolveWindowKind("tauri://localhost/index.html?window=history")).toBe(
      "history",
    );
  });

  it("treats unknown values as main", () => {
    expect(resolveWindowKind("tauri://localhost/index.html?window=unknown")).toBe(
      "main",
    );
  });
});
