import { describe, expect, it } from "vitest";
import { convertHangulToQwerty } from "./koreanKeyboard";

describe("convertHangulToQwerty", () => {
  it("converts Korean 2-set output back to QWERTY letters", () => {
    expect(convertHangulToQwerty("ㅠ갸ㅇㅎㄷ")).toBe("bridge");
    expect(convertHangulToQwerty("메ㅔㅣㄷ")).toBe("apple");
  });

  it("decomposes completed Hangul syllables using the original key sequence", () => {
    expect(convertHangulToQwerty("갓")).toBe("rkt");
  });

  it("preserves non-Hangul text", () => {
    expect(convertHangulToQwerty("set-ㅠ갸ㅇㅎㄷ")).toBe("set-bridge");
  });
});
