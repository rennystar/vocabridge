import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import BottomUtilityRail from "./BottomUtilityRail";

vi.mock("motion/react", () => {
  type MotionStubProps = React.HTMLAttributes<HTMLElement> &
    React.SVGProps<SVGElement> & {
      animate?: unknown;
      initial?: unknown;
      transition?: unknown;
      variants?: unknown;
    };

  const createMotionElement = (tag: string) =>
    React.forwardRef<Element, MotionStubProps>(
      (
        {
          animate: _animate,
          initial: _initial,
          transition: _transition,
          variants: _variants,
          ...props
        },
        ref,
      ) => React.createElement(tag, { ...props, ref }),
    );

  return {
    motion: {
      g: createMotionElement("g"),
      line: createMotionElement("line"),
      svg: createMotionElement("svg"),
    },
    useAnimation: () => ({
      start: vi.fn(),
    }),
  };
});

describe("BottomUtilityRail", () => {
  it("centers the app identity and hides source when only one source exists", () => {
    render(
      <BottomUtilityRail
        source="free_dictionary"
        sources={["free_dictionary"]}
        onOpenHistory={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByText("VocaBridge")).toBeTruthy();
    expect(screen.getByAltText("VocaBridge logo")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("opens companion windows from quiet utility actions", async () => {
    const user = userEvent.setup();
    const onOpenHistory = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <BottomUtilityRail
        source="free_dictionary"
        sources={["free_dictionary", "cambridge"]}
        onOpenHistory={onOpenHistory}
        onOpenSettings={onOpenSettings}
      />,
    );

    await user.click(screen.getByRole("button", { name: /open history/i }));
    await user.click(screen.getByRole("button", { name: /open settings/i }));

    expect(onOpenHistory).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("renders icon-only controls with accessible labels without native titles", () => {
    render(
      <BottomUtilityRail
        source="free_dictionary"
        sources={["free_dictionary", "cambridge"]}
        onOpenHistory={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open history" }).getAttribute("title"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open settings" }).getAttribute("title"),
    ).toBeNull();
    expect(screen.getByTestId("history-icon")).toBeTruthy();
    expect(screen.getByTestId("settings-icon")).toBeTruthy();
  });

  it("shows shadcn tooltips for quiet utility actions", async () => {
    const user = userEvent.setup();

    render(
      <BottomUtilityRail
        source="free_dictionary"
        sources={["free_dictionary", "cambridge"]}
        onOpenHistory={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Open history" }));

    expect(await screen.findByRole("tooltip", { name: "History" })).toBeTruthy();
  });

  it("renders the utility rail as an ambient surface with a passive source indicator", () => {
    render(
      <BottomUtilityRail
        source="cambridge"
        sources={["free_dictionary", "cambridge"]}
        onOpenHistory={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    const rail = screen.getByTestId("bottom-utility-rail");
    expect(rail.className).toContain("bg-gradient-to-t");
    expect(rail.className).not.toContain("border-t");
    expect(screen.getByTestId("app-identity").className).toContain(
      "left-1/2",
    );

    const sourceIndicator = screen.getByTestId("source-indicator");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(sourceIndicator.className).toContain("rounded-full");
    expect(sourceIndicator.className).toContain("bg-app-text/[0.025]");
    expect(sourceIndicator.textContent).toContain("Cambridge");
  });
});
