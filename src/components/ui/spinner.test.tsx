import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("renders an accessible loading indicator", () => {
    render(<Spinner />);

    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner.getAttribute("class")).toContain("animate-spin");
  });
});
