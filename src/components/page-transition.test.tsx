import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTransition } from "./page-transition";

describe("PageTransition", () => {
  it("renders children inside the animated wrapper", () => {
    render(
      <PageTransition>
        <span data-testid="content">hello</span>
      </PageTransition>,
    );

    const child = screen.getByTestId("content");
    expect(child).toBeInTheDocument();

    const wrapper = child.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("animate-in");
    expect(wrapper?.className).toContain("fade-in");
    expect(wrapper?.className).toContain("duration-300");
  });

  it("renders multiple children", () => {
    render(
      <PageTransition>
        <span>one</span>
        <span>two</span>
      </PageTransition>,
    );

    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });
});
