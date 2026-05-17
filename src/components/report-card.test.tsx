import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReportCard } from "./report-card";
import type { SagaStatus } from "@/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  deleteAnalysis: vi.fn(),
}));

const baseSaga: SagaStatus = {
  correlationId: "c1",
  analysisId: "a1",
  diagramId: "d1",
  currentState: "Completed",
  fileName: "test-diagram.png",
  retryCount: 0,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:31:00Z",
  processingTimeMs: 5200,
};

describe("ReportCard", () => {
  it("renders the friendly name from fileName", () => {
    render(<ReportCard saga={baseSaga} />);
    expect(screen.getByText("Test Diagram")).toBeInTheDocument();
  });

  it("renders the status badge", () => {
    render(<ReportCard saga={baseSaga} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders processing time", () => {
    render(<ReportCard saga={baseSaga} />);
    expect(screen.getByText("5.2s")).toBeInTheDocument();
  });

  it("renders creation date", () => {
    render(<ReportCard saga={baseSaga} />);
    const dateEl = screen.getByText(/15\/01/);
    expect(dateEl).toBeInTheDocument();
  });

  it("shows error message when present", () => {
    const sagaWithError = {
      ...baseSaga,
      currentState: "Failed",
      errorMessage: "AI provider timed out",
    };
    render(<ReportCard saga={sagaWithError} />);
    expect(screen.getByText("AI provider timed out")).toBeInTheDocument();
  });

  it("shows retry count when > 0", () => {
    const sagaWithRetries = { ...baseSaga, retryCount: 2 };
    render(<ReportCard saga={sagaWithRetries} />);
    expect(screen.getByText("2 retries")).toBeInTheDocument();
  });

  it("uses analysisId when no fileName", () => {
    const sagaNoFile = { ...baseSaga, fileName: undefined };
    render(<ReportCard saga={sagaNoFile} />);
    expect(screen.getByText("Analysis a1")).toBeInTheDocument();
  });

  it("links to the analysis detail page", () => {
    render(<ReportCard saga={baseSaga} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/analyses/d1");
  });

  it("opens delete dialog on trash click", () => {
    render(<ReportCard saga={baseSaga} />);
    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);
    expect(screen.getByText("Delete Analysis")).toBeInTheDocument();
  });

  it("closes delete dialog on cancel", () => {
    render(<ReportCard saga={baseSaga} />);
    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Delete Analysis")).not.toBeInTheDocument();
  });

  it("calls deleteAnalysis and onDeleted on confirm", async () => {
    const { deleteAnalysis } = await import("@/lib/api");
    vi.mocked(deleteAnalysis).mockResolvedValue();

    const onDeleted = vi.fn();
    render(<ReportCard saga={baseSaga} onDeleted={onDeleted} />);

    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);

    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    expect(deleteAnalysis).toHaveBeenCalledWith("d1", "a1");
  });

  it("shows error message from catch on delete failure", async () => {
    const { deleteAnalysis } = await import("@/lib/api");
    vi.mocked(deleteAnalysis).mockRejectedValue(new Error("Network timeout"));

    render(<ReportCard saga={baseSaga} />);

    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);

    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    expect(deleteAnalysis).toHaveBeenCalled();
  });

  it("does not show processing time when zero", () => {
    const saga = { ...baseSaga, processingTimeMs: 0 };
    render(<ReportCard saga={saga} />);
    expect(screen.queryByText("0.0s")).not.toBeInTheDocument();
  });

  it("does not show processing time when undefined", () => {
    const saga = { ...baseSaga, processingTimeMs: undefined };
    render(<ReportCard saga={saga} />);
    expect(screen.queryByText(/\d+\.\d+s/)).not.toBeInTheDocument();
  });

  it("handles successful delete without onDeleted callback", async () => {
    const { deleteAnalysis } = await import("@/lib/api");
    vi.mocked(deleteAnalysis).mockResolvedValue();

    render(<ReportCard saga={baseSaga} />);

    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);

    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    expect(deleteAnalysis).toHaveBeenCalledWith("d1", "a1");
  });

  it("handles delete failure with non-Error object", async () => {
    const { deleteAnalysis } = await import("@/lib/api");
    vi.mocked(deleteAnalysis).mockRejectedValue("string error");

    render(<ReportCard saga={baseSaga} />);

    const deleteBtn = document.querySelector("[class*='hover:text-destructive']") as HTMLElement;
    fireEvent.click(deleteBtn);

    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    expect(deleteAnalysis).toHaveBeenCalled();
  });
});
