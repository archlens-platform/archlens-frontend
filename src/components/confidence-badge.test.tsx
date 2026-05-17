import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBadge } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  it("renders percentage value", () => {
    render(<ConfidenceBadge value={0.85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("rounds percentage correctly", () => {
    render(<ConfidenceBadge value={0.666} />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("applies green color for high confidence (>= 0.8)", () => {
    const { container } = render(<ConfidenceBadge value={0.9} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-green");
  });

  it("applies yellow color for medium confidence (>= 0.6)", () => {
    const { container } = render(<ConfidenceBadge value={0.65} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-yellow");
  });

  it("applies orange color for low confidence (>= 0.4)", () => {
    const { container } = render(<ConfidenceBadge value={0.45} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-orange");
  });

  it("applies red color for very low confidence (< 0.4)", () => {
    const { container } = render(<ConfidenceBadge value={0.2} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-red");
  });

  it("handles zero value", () => {
    render(<ConfidenceBadge value={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles value of 1", () => {
    render(<ConfidenceBadge value={1} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
