import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FixedDiagram } from "./fixed-diagram";

const generateFixedDiagramMock = vi.fn();
vi.mock("@/lib/api", () => ({
  generateFixedDiagram: (analysisId: string, diagramName?: string | null) =>
    generateFixedDiagramMock(analysisId, diagramName),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const mermaidInit = vi.fn();
const mermaidRender = vi.fn();
vi.mock("mermaid", () => ({
  default: {
    initialize: (...args: unknown[]) => mermaidInit(...args),
    render: (...args: unknown[]) =>
      mermaidRender(...(args as [string, string])),
  },
}));

const html2canvasMock = vi.fn();
vi.mock("html2canvas-pro", () => ({
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

const jsPdfMock = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn(),
};
vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => jsPdfMock),
}));

beforeEach(() => {
  vi.clearAllMocks();
  generateFixedDiagramMock.mockResolvedValue({
    mermaid: "graph TD; A-->B",
    provider: "openai",
  });
  mermaidRender.mockResolvedValue({ svg: "<svg id='fixed-svg'></svg>" });
  html2canvasMock.mockResolvedValue({
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
      expect(generateFixedDiagramMock).toHaveBeenCalledWith("abc", "My Diagram");
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
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
      expect(mermaidRender).toHaveBeenCalled();
    });
  });

  it("notifies and collapses the panel when the API call fails", async () => {
    generateFixedDiagramMock.mockRejectedValueOnce(new Error("boom"));
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Failed to generate corrected diagram. Please try again.",
      );
    });

    expect(
      screen.getByRole("button", { name: /Fix.*Export Diagram/i }),
    ).toBeInTheDocument();
  });

  it("falls back to a code preview when mermaid throws while rendering", async () => {
    mermaidRender.mockRejectedValue(new Error("invalid"));
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mermaidRender).toHaveBeenCalled();
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
      expect(generateFixedDiagramMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));
    await waitFor(() => {
      expect(generateFixedDiagramMock).toHaveBeenCalledTimes(2);
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
    html2canvasMock.mockResolvedValueOnce({
      toDataURL: () => "data:image/png;base64,tall",
      width: 200,
      height: 400,
    });

    render(<FixedDiagram analysisId="abc" diagramName="Service Map" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(jsPdfMock.save).toHaveBeenCalledWith(
        "archlens-fixed-Service_Map.pdf",
      );
    });

    expect(toastSuccess).toHaveBeenCalledWith("PDF exported successfully!");
  });

  it("uses a landscape layout when the canvas is wider than tall", async () => {
    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(jsPdfMock.save).toHaveBeenCalled();
    });

    const savedFilename = jsPdfMock.save.mock.calls[0][0] as string;
    expect(savedFilename).toBe("archlens-fixed-diagram.pdf");
  });

  it("notifies when the PDF export fails", async () => {
    html2canvasMock.mockRejectedValueOnce(new Error("canvas error"));

    render(<FixedDiagram analysisId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /Fix.*Export Diagram/i }));

    await waitFor(() => {
      expect(mermaidRender).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to export PDF.");
    });
  });
});
