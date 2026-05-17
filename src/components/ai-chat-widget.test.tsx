import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIChatWidget } from "./ai-chat-widget";

const mockParams: Record<string, string> = {};
let mockPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  usePathname: () => mockPathname,
}));

let mockAuthed = true;
vi.mock("@/lib/auth", () => ({
  isAuthenticated: () => mockAuthed,
}));

const mockPost = vi.fn();
const mockGet = vi.fn();
vi.mock("@/lib/api", () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("@/components/chat-message", () => ({
  ChatMessage: ({ content, role }: { content: string; role: string }) => (
    <div data-testid={`msg-${role}`}>{content}</div>
  ),
}));

const completedAnalysis = {
  correlationId: "c1",
  analysisId: "a1",
  diagramId: "d1",
  currentState: "Completed",
  fileName: "test.png",
  retryCount: 0,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const secondAnalysis = {
  correlationId: "c2",
  analysisId: "a2",
  diagramId: "d2",
  currentState: "Completed",
  fileName: "second.png",
  retryCount: 0,
  createdAt: "2026-01-02",
  updatedAt: "2026-01-02",
};

function mockWithAnalyses(analyses = [completedAnalysis]) {
  mockGet.mockResolvedValue({
    data: {
      items: analyses,
      page: 1,
      pageSize: 10,
      totalCount: analyses.length,
      totalPages: 1,
    },
  });
}

describe("AIChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthed = true;
    mockPathname = "/dashboard";
    mockGet.mockResolvedValue({
      data: { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
    });
  });

  it("does not render when not authenticated", () => {
    mockAuthed = false;
    render(<AIChatWidget />);
    expect(screen.queryByText("ArchLens AI")).not.toBeInTheDocument();
  });

  it("renders floating button when authenticated", () => {
    render(<AIChatWidget />);
    expect(screen.getByLabelText("Open AI chat")).toBeInTheDocument();
  });

  it("opens chat panel when FAB is clicked", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    expect(screen.getByText("ArchLens AI")).toBeInTheDocument();
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("closes chat panel when close button is clicked", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    expect(screen.getByText("ArchLens AI")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close AI chat"));
  });

  it("closes on Escape key", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
  });

  it("shows analysis selector when analyses are loaded", async () => {
    mockWithAnalyses([{ ...completedAnalysis, fileName: "my-diagram.png" }]);
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    await waitFor(() => {
      expect(screen.getByText("my-diagram.png")).toBeInTheDocument();
    });
  });

  it("shows suggestions when analysis is selected", async () => {
    mockWithAnalyses();
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    await waitFor(() => {
      expect(screen.getByText("What are the main scalability concerns?")).toBeInTheDocument();
    });
  });

  it("sends message and displays response", async () => {
    mockWithAnalyses();
    mockPost.mockResolvedValueOnce({
      data: { content: "The architecture looks solid." },
    });

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("What are the main scalability concerns?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("What are the main scalability concerns?"));

    await waitFor(() => {
      expect(screen.getByText("The architecture looks solid.")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    mockWithAnalyses();
    mockPost.mockRejectedValueOnce(new Error("Network error"));

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("How can I improve security?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("How can I improve security?"));

    await waitFor(() => {
      expect(screen.getByText(/couldn't process your question/)).toBeInTheDocument();
    });
  });

  it("handles non-Error thrown objects", async () => {
    mockWithAnalyses();
    mockPost.mockRejectedValueOnce("string error");

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("What are the main scalability concerns?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("What are the main scalability concerns?"));

    await waitFor(() => {
      expect(screen.getByText(/Unknown error/)).toBeInTheDocument();
    });
  });

  it("shows prompt when no analysis is selected", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));
    expect(
      screen.getByText(/Navigate to an analysis or select one above/)
    ).toBeInTheDocument();
  });

  it("parses SSE string responses", async () => {
    mockWithAnalyses();
    mockPost.mockResolvedValueOnce({
      data: 'data: {"content":"streamed response"}\ndata: [DONE]',
    });

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("Is there a single point of failure?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Is there a single point of failure?"));

    await waitFor(() => {
      expect(screen.getByText("streamed response")).toBeInTheDocument();
    });
  });

  it("switches analysis via selector dropdown", async () => {
    mockWithAnalyses([completedAnalysis, secondAnalysis]);

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("test.png"));

    await waitFor(() => {
      expect(screen.getByText("second.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("second.png"));
  });

  it("sends message via Enter key in textarea", async () => {
    mockWithAnalyses();
    mockPost.mockResolvedValueOnce({
      data: { content: "Response via enter" },
    });

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask about your architecture...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Ask about your architecture...");
    fireEvent.change(textarea, { target: { value: "test question" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(screen.getByText("Response via enter")).toBeInTheDocument();
    });
  });

  it("does not send on Shift+Enter", async () => {
    mockWithAnalyses();

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask about your architecture...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Ask about your architecture...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it("clears messages when clear button is clicked", async () => {
    mockWithAnalyses();
    mockPost.mockResolvedValueOnce({
      data: { content: "Some response" },
    });

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByText("What are the main scalability concerns?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("What are the main scalability concerns?"));

    await waitFor(() => {
      expect(screen.getByText("Some response")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Clear chat"));

    await waitFor(() => {
      expect(screen.getByText("How can I help?")).toBeInTheDocument();
    });
  });

  it("sends message via send button", async () => {
    mockWithAnalyses();
    mockPost.mockResolvedValueOnce({
      data: { content: "Button response" },
    });

    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask about your architecture...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Ask about your architecture...");
    fireEvent.change(textarea, { target: { value: "button question" } });

    const sendButton = textarea.closest(".flex.gap-2")?.querySelector("button");
    expect(sendButton).toBeInTheDocument();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(screen.getByText("Button response")).toBeInTheDocument();
    });
  });

  it("disables textarea when no analysis selected", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByLabelText("Open AI chat"));

    const textarea = screen.getByPlaceholderText("Select an analysis first...");
    expect(textarea).toBeDisabled();
  });
});
