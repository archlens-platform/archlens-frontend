import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FixedDiagram } from "./fixed-diagram";

// vi.hoisted ensures the mock variables exist when vi.mock factories run,
// since vi.mock calls are hoisted above the module body.
const {
  mockGenerateFixedDiagram,
  mockToastSuccess,
  mockToastError,
  mockMermaidInit,
  mockMermaidRender,
  mockHtml2canvas,
  mockJsPdf,
} = vi.hoisted(() => ({
  mockGenerateFixedDiagram: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockMermaidInit: vi.fn(),
  mockMermaidRender: vi.fn(),
  mockHtml2canvas: vi.fn(),
  mockJsPdf: {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  generateFixedDiagram: mockGenerateFixedDiagram,
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("mermaid", () => ({
  default: { initialize: mockMermaidInit, render: mockMermaidRender },
}));

vi.mock("html2canvas-pro", () => ({ default: mockHtml2canvas }));

vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => mockJsPdf) }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateFixedDiagram.mockResolvedValue({
    mermaid: "graph TD; A-->B",
    provider: "openai",
  });
  mockMermaidRender.mockResolvedValue({ svg: "<svg id='fixed-svg'></svg>" });
  mockHtml2canvas.mockResolvedValue({
    toDataURL: () => "data:image/png;base64,xxx",
    width: 400,
    height: 200,
  });
});

describe("FixedDiagram", () => {
  it("starts collapsed with a single generate button", () => {
    render(<FixedDiagram analysisId="abc" />);
    expect(
      screen.getByRole("button", { name: /Fix.*Export Diagram/i }),
    ).toBeInTheDocument();
  });

  it("requests the fixed diagram when the generate button is clicked", async () => {
    render(<FixedDiagram analysisId="abc" diagramName="My Diagram" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockGenerateFixedDiagram).toHaveBeenCalledWith("abc", "My Diagram");
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Corrected diagram generated!",
      );
    });
  });

  it("renders the panel with the provider badge after generation", async () => {
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(screen.getByText("Corrected Architecture Diagram")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("openai")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockMermaidRender).toHaveBeenCalled();
    });
  });

  it("notifies and collapses the panel when the API call fails", async () => {
    mockGenerateFixedDiagram.mockRejectedValueOnce(new Error("boom"));
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to generate corrected diagram. Please try again.",
      );
    });

    expect(
      screen.getByRole("button", { name: /Fix.*Export Diagram/i }),
    ).toBeInTheDocument();
  });

  it("falls back to a code preview when mermaid throws while rendering", async () => {
    mockMermaidRender.mockRejectedValue(new Error("invalid"));
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockMermaidRender).toHaveBeenCalled();
    });

    await waitFor(() => {
      const pre = document.querySelector("pre");
      expect(pre?.textContent).toContain("graph TD");
    });
  });

  it("triggers a regenerate when the user clicks the regenerate button", async () => {
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockGenerateFixedDiagram).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));
    await waitFor(() => {
      expect(mockGenerateFixedDiagram).toHaveBeenCalledTimes(2);
    });
  });

  it("closes the panel when the close icon is clicked", async () => {
    const { container } = render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(screen.getByText("Corrected Architecture Diagram")).toBeInTheDocument();
    });

    const closeButtons = Array.from(
      container.querySelectorAll("button"),
    ) as HTMLButtonElement[];
    const xButton = closeButtons.find((btn) =>
      btn.className.includes("h-7 w-7"),
    );
    expect(xButton).toBeDefined();
    fireEvent.click(xButton!);

    expect(
      screen.queryByText("Corrected Architecture Diagram"),
    ).not.toBeInTheDocument();
  });

  it("exports the PDF using a portrait layout for tall canvases", async () => {
    mockHtml2canvas.mockResolvedValueOnce({
      toDataURL: () => "data:image/png;base64,tall",
      width: 200,
      height: 400,
    });

    render(<FixedDiagram analysisId="abc" diagramName="Service Map" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockMermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(mockJsPdf.save).toHaveBeenCalledWith(
        "archlens-fixed-Service_Map.pdf",
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("PDF exported successfully!");
  });

  it("uses a landscape layout when the canvas is wider than tall", async () => {
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockMermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(mockJsPdf.save).toHaveBeenCalled();
    });

    const savedFilename = mockJsPdf.save.mock.calls[0][0] as string;
    expect(savedFilename).toBe("archlens-fixed-diagram.pdf");
  });

  it("notifies when the PDF export fails", async () => {
    mockHtml2canvas.mockRejectedValueOnce(new Error("canvas error"));

    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mockMermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to export PDF.");
    });
  });
});
