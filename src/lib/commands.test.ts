import { describe, expect, it } from "vitest";
import { lookupWord, TAURI_RUNTIME_UNAVAILABLE_MESSAGE } from "./commands";

describe("commands", () => {
  it("returns a stable error when Tauri commands are used in a browser preview", async () => {
    await expect(lookupWord("set", "free_dictionary")).rejects.toThrow(
      TAURI_RUNTIME_UNAVAILABLE_MESSAGE,
    );
  });
});
