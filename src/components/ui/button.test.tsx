import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button by default", () => {
    render(<Button variant="ghost">Open</Button>);

    expect(screen.getByRole("button", { name: "Open" })).not.toBeNull();
  });

  it("can render a child element when composition is needed", () => {
    render(
      <Button asChild>
        <a href="/settings">Settings</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Settings" });
    expect(link.getAttribute("href")).toBe("/settings");
  });
});
