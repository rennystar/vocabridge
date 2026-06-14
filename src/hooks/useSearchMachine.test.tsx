import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WordEntry } from "../lib/types";
import { useSearchMachine } from "./useSearchMachine";

const entry: WordEntry = {
  word: "bridge",
  source: "cambridge",
  entries: [],
};

describe("useSearchMachine", () => {
  it("keeps saved snapshot audio disabled after clearing the input", () => {
    const { result } = renderHook(() => useSearchMachine());

    act(() => {
      result.current.dispatch({
        type: "RESULT",
        entry,
        autoPlayAudio: false,
      });
    });

    expect(result.current.state.autoPlayResultAudio).toBe(false);

    act(() => {
      result.current.dispatch({ type: "CLEAR" });
    });

    expect(result.current.state.result).toBeNull();
    expect(result.current.state.previousResult).toBe(entry);
    expect(result.current.state.autoPlayResultAudio).toBe(false);
  });

  it("keeps direct lookup audio enabled after clearing the input", () => {
    const { result } = renderHook(() => useSearchMachine());

    act(() => {
      result.current.dispatch({ type: "RESULT", entry });
    });

    act(() => {
      result.current.dispatch({ type: "CLEAR" });
    });

    expect(result.current.state.result).toBeNull();
    expect(result.current.state.previousResult).toBe(entry);
    expect(result.current.state.autoPlayResultAudio).toBe(true);
  });
});
