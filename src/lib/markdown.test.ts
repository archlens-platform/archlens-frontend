import { describe, it, expect } from "vitest";
import { escapeHtml, formatMarkdown } from "./markdown";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello\'')).toBe("&quot;hello&#039;");
  });

  it("escapes script tags to prevent XSS", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("formatMarkdown", () => {
  it("converts h4 headings", () => {
    const result = formatMarkdown("#### My Title");
    expect(result).toContain('<p class="font-semibold mt-3 mb-1">My Title</p>');
  });

  it("converts h3 headings", () => {
    const result = formatMarkdown("### Section");
    expect(result).toContain('<p class="font-bold mt-4 mb-1 text-sm">Section</p>');
  });

  it("accepts custom heading styles", () => {
    const result = formatMarkdown("#### Title", {
      h4: "custom-h4",
      h3: "custom-h3",
    });
    expect(result).toContain('<p class="custom-h4">Title</p>');
  });

  it("converts bold text", () => {
    const result = formatMarkdown("this is **bold** text");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("converts double newlines to double br", () => {
    const result = formatMarkdown("line1\n\nline2");
    expect(result).toContain("<br/><br/>");
  });

  it("converts single newlines to br", () => {
    const result = formatMarkdown("line1\nline2");
    expect(result).toContain("<br/>");
  });

  it("converts bullet points with bold", () => {
    const result = formatMarkdown("- **item**");
    expect(result).toContain("&bull; <strong>");
  });

  it("converts plain bullet points", () => {
    const result = formatMarkdown("- item");
    expect(result).toContain("&bull; item");
  });

  it("removes horizontal rules", () => {
    const result = formatMarkdown("above---below");
    expect(result).not.toContain("---");
  });

  it("formats numbered lists", () => {
    const result = formatMarkdown("1. first item");
    expect(result).toContain("<br/>1. first item");
  });

  it("escapes HTML before formatting", () => {
    const result = formatMarkdown("<b>not bold</b>");
    expect(result).not.toContain("<b>");
    expect(result).toContain("&lt;b&gt;");
  });

  it("handles heading with only spaces after hash (no content)", () => {
    const result = formatMarkdown("####    ");
    expect(result).not.toContain("<p class=");
  });

  it("handles multiple headings", () => {
    const result = formatMarkdown("### First\n#### Second");
    expect(result).toContain("First</p>");
    expect(result).toContain("Second</p>");
  });
});
