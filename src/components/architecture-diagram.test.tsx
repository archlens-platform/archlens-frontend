import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ArchitectureDiagram } from "./architecture-diagram";
import type { ComponentDto, ConnectionDto } from "@/types";

let mockTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockTheme }),
}));

const mockInitialize = vi.fn();
const mockRender = vi.fn().mockResolvedValue({
  svg: '<svg id="test-svg"><g id="flowchart-API_Gateway-1" style=""></g><g id="flowchart-User_Service-2" style=""></g></svg>',
});
vi.mock("mermaid", () => ({
  default: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    render: (...args: unknown[]) => mockRender(...args),
  },
}));

const mockComponents: ComponentDto[] = [
  { name: "API Gateway", type: "gateway", description: "Entry point", confidence: 0.9 },
  { name: "User Service", type: "service", description: "Handles users", confidence: 0.85 },
  { name: "PostgreSQL", type: "database", description: "Main DB", confidence: 0.95 },
  { name: "Redis Cache", type: "cache", description: "Caching layer", confidence: 0.9 },
  { name: "Kafka", type: "queue", description: "Message broker", confidence: 0.8 },
  { name: "Web App", type: "frontend", description: "Client app", confidence: 0.9 },
];

const mockConnections: ConnectionDto[] = [
  { source: "API Gateway", target: "User Service", type: "REST", description: "Routes requests" },
  { source: "User Service", target: "PostgreSQL", type: "TCP", description: "Reads/writes data" },
  { source: "User Service", target: "Redis Cache", type: "unknown", description: "Caches data" },
  { source: "Unknown Source", target: "Unknown Target", type: "TCP", description: "Orphan connection" },
];

describe("ArchitectureDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
  });

  it("renders nothing when components are empty", () => {
    const { container } = render(
      <ArchitectureDiagram components={[]} connections={[]} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders diagram container with components", async () => {
    const { container } = render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    expect(container.querySelector(".group")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });
  });

  it("calls mermaid with correct theme for dark mode", async () => {
    mockTheme = "dark";
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: "base",
          themeVariables: expect.objectContaining({
            primaryColor: "#0e4d5e",
          }),
        })
      );
    });
  });

  it("calls mermaid with correct theme for light mode", async () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          themeVariables: expect.objectContaining({
            primaryColor: "#0891b2",
          }),
        })
      );
    });
  });

  it("shows expand button", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    expect(screen.getByText("Expand")).toBeInTheDocument();
  });

  it("opens fullscreen mode when expand is clicked", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.getByText(/Zoom:/)).toBeInTheDocument();
  });

  it("closes fullscreen when backdrop is clicked", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Reset")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close fullscreen"));
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("closes fullscreen on Escape key", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Reset")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("resets zoom when Reset button is clicked", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Zoom: 100% — Scroll to zoom")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByText("Zoom: 100% — Scroll to zoom")).toBeInTheDocument();
  });

  it("zooms in on wheel scroll up", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));

    const scrollArea = screen.getByText(/Zoom:/).closest(".relative")?.querySelector(".flex-1.overflow-auto");
    expect(scrollArea).toBeInTheDocument();

    // Scroll up = zoom in (deltaY < 0)
    fireEvent.wheel(scrollArea!, { deltaY: -100 });
    expect(screen.getByText("Zoom: 115% — Scroll to zoom")).toBeInTheDocument();
  });

  it("zooms out on wheel scroll down", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));

    const scrollArea = screen.getByText(/Zoom:/).closest(".relative")?.querySelector(".flex-1.overflow-auto");
    expect(scrollArea).toBeInTheDocument();

    // Scroll down = zoom out (deltaY > 0)
    fireEvent.wheel(scrollArea!, { deltaY: 100 });
    expect(screen.getByText("Zoom: 85% — Scroll to zoom")).toBeInTheDocument();
  });

  it("closes fullscreen via close button in header", () => {
    render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );
    fireEvent.click(screen.getByText("Expand"));

    // The close button is the rounded-full one next to Reset
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find(
      (b) => b.classList.contains("rounded-full") && b.closest(".flex.items-center.gap-2")
    );
    if (closeBtn) fireEvent.click(closeBtn);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("handles mermaid render failure gracefully", async () => {
    mockRender.mockRejectedValueOnce(new Error("Mermaid failed"));

    const { container } = render(
      <ArchitectureDiagram components={mockComponents} connections={mockConnections} />
    );

    await waitFor(() => {
      expect(mockRender).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("handles components with various types for shape mapping", async () => {
    const diverseComponents: ComponentDto[] = [
      { name: "MongoDB", type: "db", description: "NoSQL", confidence: 0.9 },
      { name: "RabbitMQ", type: "rabbit", description: "Queue", confidence: 0.9 },
      { name: "Nginx", type: "proxy", description: "LB", confidence: 0.9 },
      { name: "Mobile", type: "mobile", description: "App", confidence: 0.9 },
      { name: "Worker", type: "microservice", description: "Worker", confidence: 0.9 },
    ];

    render(
      <ArchitectureDiagram components={diverseComponents} connections={[]} />
    );

    await waitFor(() => {
      expect(mockRender).toHaveBeenCalled();
    });

    const syntaxArg = mockRender.mock.calls[0][1] as string;
    expect(syntaxArg).toContain("MongoDB");
    expect(syntaxArg).toContain("RabbitMQ");
    expect(syntaxArg).toContain("Nginx");
    expect(syntaxArg).toContain("Mobile");
  });

  it("renders with partial name matching for connections", async () => {
    const comps: ComponentDto[] = [
      { name: "Auth Service", type: "service", description: "", confidence: 0.9 },
      { name: "User Database", type: "database", description: "", confidence: 0.9 },
    ];
    const conns: ConnectionDto[] = [
      { source: "Auth", target: "User Database", type: "SQL", description: "" },
    ];

    render(<ArchitectureDiagram components={comps} connections={conns} />);

    await waitFor(() => {
      expect(mockRender).toHaveBeenCalled();
    });

    const syntaxArg = mockRender.mock.calls[0][1] as string;
    expect(syntaxArg).toContain("|SQL|");
  });
});
