import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "./chat-message";

describe("ChatMessage", () => {
  it("renders user message as plain text", () => {
    render(<ChatMessage role="user" content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders assistant message with markdown formatting", () => {
    const { container } = render(
      <ChatMessage role="assistant" content="This is **bold** text" />
    );
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe("bold");
  });

  it("escapes HTML in assistant messages to prevent XSS", () => {
    const { container } = render(
      <ChatMessage role="assistant" content='<script>alert("xss")</script>' />
    );
    const html = container.innerHTML;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows streaming indicator when isStreaming is true", () => {
    const { container } = render(
      <ChatMessage role="assistant" content="typing..." isStreaming />
    );
    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).toBeInTheDocument();
  });

  it("does not show streaming indicator when isStreaming is false", () => {
    const { container } = render(
      <ChatMessage role="assistant" content="done" isStreaming={false} />
    );
    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).not.toBeInTheDocument();
  });

  it("renders newlines as line breaks for assistant", () => {
    const { container } = render(
      <ChatMessage role="assistant" content={"line1\nline2"} />
    );
    const brs = container.querySelectorAll("br");
    expect(brs.length).toBeGreaterThan(0);
  });

  it("renders bullet points from markdown list", () => {
    const { container } = render(
      <ChatMessage role="assistant" content={"- item1\n- item2"} />
    );
    expect(container.textContent).toContain("item1");
    expect(container.textContent).toContain("item2");
  });
});
