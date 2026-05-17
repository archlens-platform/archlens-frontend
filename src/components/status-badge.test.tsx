import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders Completed status", () => {
    render(<StatusBadge status="Completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders Processing status with pulse animation", () => {
    const { container } = render(<StatusBadge status="Processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("animate-pulse");
  });

  it("renders Failed status with red styling", () => {
    const { container } = render(<StatusBadge status="Failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-red");
  });

  it("renders Received status", () => {
    render(<StatusBadge status="Received" />);
    expect(screen.getByText("Received")).toBeInTheDocument();
  });

  it("renders Error status", () => {
    render(<StatusBadge status="Error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("handles unknown status gracefully", () => {
    render(<StatusBadge status="Unknown" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
