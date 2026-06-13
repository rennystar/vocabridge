import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SearchState } from "../hooks/useSearchMachine";
import SearchInput from "./SearchInput";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onFocusChanged: vi.fn().mockResolvedValue(vi.fn()),
  }),
}));

const baseState: SearchState = {
  status: "idle",
  query: "",
  result: null,
  error: null,
  previousResult: null,
};

function renderSearchInput(
  state: SearchState,
  props: Partial<React.ComponentProps<typeof SearchInput>> = {},
) {
  return render(
    <SearchInput
      searchDelay={100}
      clearDelay={1000}
      state={state}
      dispatch={vi.fn()}
      onSearch={vi.fn()}
      onClear={vi.fn()}
      convertKoreanInput={true}
      {...props}
    />,
  );
}

describe("SearchInput", () => {
  it("does not reserve a separate feedback row while idle", () => {
    renderSearchInput(baseState);

    expect(screen.getByTestId("search-line")).toBeTruthy();
    expect(screen.getByPlaceholderText("Type a word...").className).toContain(
      "text-[length:var(--vb-search-size)]",
    );
    expect(screen.queryByTestId("search-feedback")).toBeNull();
    expect(screen.queryByTestId("search-spinner")).toBeNull();
  });

  it("shows the spinner inside the search line while searching", () => {
    renderSearchInput({ ...baseState, status: "searching", query: "test" });

    const searchLine = screen.getByTestId("search-line");
    const spinner = screen.getByRole("status", { name: "Loading" });

    expect(searchLine.contains(spinner)).toBe(true);
    expect(spinner.getAttribute("class")).toContain("absolute");
    expect(screen.queryByTestId("search-feedback")).toBeNull();
  });

  it("refocuses the input when the browser window regains focus", () => {
    renderSearchInput(baseState);

    const input = screen.getByPlaceholderText("Type a word...");
    input.blur();
    expect(document.activeElement).not.toBe(input);

    fireEvent.focus(window);

    expect(document.activeElement).toBe(input);
  });

  it("keeps error messages visible until the user acts", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderSearchInput(
      { ...baseState, status: "error", query: "set", error: "Preview error" },
      { dispatch },
    );

    vi.advanceTimersByTime(1000);

    expect(screen.getByText("Preview error")).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalledWith({ type: "CLEAR" });
    vi.useRealTimers();
  });

  it("converts Korean 2-set keyboard output before dispatching typed text", () => {
    const dispatch = vi.fn();
    renderSearchInput(baseState, { dispatch });

    fireEvent.change(screen.getByPlaceholderText("Type a word..."), {
      target: { value: "ㅠ갸ㅇㅎㄷ" },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "TYPE", text: "bridge" });
  });
});
