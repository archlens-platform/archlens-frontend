import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MermaidRenderer } from "./mermaid-renderer";

let mockTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockTheme }),
}));

const renderMermaidMock = vi.fn();
vi.mock("@/lib/mermaid-render-queue", () => ({
  renderMermaid: (code: string, isDark: boolean) => renderMermaidMock(code, isDark),
}));

const applyComponentStylesMock = vi.fn((svg: string) => svg);
const applyAutoComponentStylesMock = vi.fn();
const applyEdgeLabelStylesMock = vi.fn();
vi.mock("@/lib/mermaid-diagram", () => ({
  applyComponentStyles: (...args: unknown[]) => applyComponentStylesMock(...(args as [string])),
  applyAutoComponentStyles: (...args: unknown[]) => applyAutoComponentStylesMock(...args),
  applyEdgeLabelStyles: (...args: unknown[]) => applyEdgeLabelStylesMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockTheme = "light";
  renderMermaidMock.mockResolvedValue(
    '<svg width="200" height="100"><g></g></svg>',
  );
  applyComponentStylesMock.mockImplementation((svg: string) => svg);
});

describe("MermaidRenderer", () => {
  it("renders nothing visible while loading and shows the loader text", () => {
    renderMermaidMock.mockReturnValue(new Promise(() => {}));
    render(<MermaidRenderer code="graph TD; A-->B" />);
    expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();
  });

  it("renders the svg after a successful render", async () => {
    const { container } = render(<MermaidRenderer code="graph TD; A-->B" />);
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
    expect(applyEdgeLabelStylesMock).toHaveBeenCalled();
  });

  it("applies component styles when components are provided", async () => {
    render(
      <MermaidRenderer
        code="graph TD; A-->B"
        components={[
          { name: "API", type: "service", description: "", confidence: 1 },
        ]}
      />,
    );
    await waitFor(() => {
      expect(applyComponentStylesMock).toHaveBeenCalled();
    });
    expect(applyAutoComponentStylesMock).not.toHaveBeenCalled();
  });

  it("falls back to auto component styling when no components are provided", async () => {
    render(<MermaidRenderer code="graph TD; A-->B" />);
    await waitFor(() => {
      expect(applyAutoComponentStylesMock).toHaveBeenCalled();
    });
  });

  it("forwards the dark flag from next-themes to the renderer", async () => {
    mockTheme = "dark";
    render(<MermaidRenderer code="graph TD; A" />);
    await waitFor(() => {
      expect(renderMermaidMock).toHaveBeenCalledWith("graph TD; A", true);
    });
  });

  it("uses the provided className when set", () => {
    const { container } = render(
      <MermaidRenderer code="graph TD; A" className="custom-class" />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("retries failed renders up to the max and shows the error state", async () => {
    renderMermaidMock.mockRejectedValue(new Error("nope"));
    render(<MermaidRenderer code="graph TD; A-->B" />);

    await waitFor(
      () => {
        expect(screen.getByText(/Failed to render diagram/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    expect(renderMermaidMock).toHaveBeenCalledTimes(3);
  });

  it("shows the regenerate copy when an onRenderError handler is provided", async () => {
    renderMermaidMock.mockRejectedValue(new Error("nope"));
    const onError = vi.fn();
    render(<MermaidRenderer code="graph TD; A-->B" onRenderError={onError} />);

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    screen.getByRole("button", { name: /Regenerate/i }).click();
    expect(onError).toHaveBeenCalled();
  });

  it("retries internally when the retry button is clicked without an onRenderError prop", async () => {
    renderMermaidMock.mockRejectedValue(new Error("nope"));
    render(<MermaidRenderer code="graph TD; A-->B" />);

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    const before = renderMermaidMock.mock.calls.length;
    screen.getByRole("button", { name: /Retry/i }).click();
    await waitFor(() => {
      expect(renderMermaidMock.mock.calls.length).toBeGreaterThan(before);
    });
  });

  it("does nothing when given an empty code prop", () => {
    render(<MermaidRenderer code="" />);
    expect(renderMermaidMock).not.toHaveBeenCalled();
  });
});
