import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ScoreRadar } from "./score-radar";

vi.mock("recharts", () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ScoreRadar", () => {
  it("renders radar chart with scores", () => {
    const scores = {
      scalability: 8,
      security: 7,
      reliability: 9,
      maintainability: 6,
    };

    const { getByTestId } = render(<ScoreRadar scores={scores} />);
    expect(getByTestId("radar-chart")).toBeInTheDocument();
    expect(getByTestId("radar")).toBeInTheDocument();
    expect(getByTestId("polar-grid")).toBeInTheDocument();
  });
});
