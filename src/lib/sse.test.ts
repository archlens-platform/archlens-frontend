import { describe, it, expect } from "vitest";
import { tryParseContent, parseSSEContent, extractResponseContent } from "./sse";

describe("tryParseContent", () => {
  it("returns content from valid JSON with content field", () => {
    expect(tryParseContent('{"content":"hello"}')).toBe("hello");
  });

  it("returns null for non-string content field", () => {
    expect(tryParseContent('{"content":123}')).toBeNull();
  });

  it("returns null when text does not start with {", () => {
    expect(tryParseContent("plain text")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(tryParseContent("{invalid}")).toBeNull();
  });

  it("returns null when content key is missing", () => {
    expect(tryParseContent('{"other":"value"}')).toBeNull();
  });
});

describe("parseSSEContent", () => {
  it("parses SSE data lines with JSON content", () => {
    const raw = 'data: {"content":"chunk1"}\ndata: {"content":"chunk2"}\ndata: [DONE]';
    expect(parseSSEContent(raw)).toBe("chunk1chunk2");
  });

  it("uses raw payload when JSON parse fails", () => {
    const raw = "data: plain text here";
    expect(parseSSEContent(raw)).toBe("plain text here");
  });

  it("returns raw string when no data: lines found", () => {
    const raw = "no sse format here";
    expect(parseSSEContent(raw)).toBe("no sse format here");
  });

  it("skips [DONE] marker", () => {
    const raw = 'data: {"content":"hello"}\ndata: [DONE]';
    expect(parseSSEContent(raw)).toBe("hello");
  });

  it("handles empty lines", () => {
    const raw = '\ndata: {"content":"a"}\n\ndata: {"content":"b"}\n';
    expect(parseSSEContent(raw)).toBe("ab");
  });
});

describe("extractResponseContent", () => {
  it("parses SSE string data", () => {
    expect(extractResponseContent('data: {"content":"hello"}\ndata: [DONE]')).toBe("hello");
  });

  it("extracts content from object with content field", () => {
    expect(extractResponseContent({ content: "from object" })).toBe("from object");
  });

  it("JSON-stringifies object without content field", () => {
    expect(extractResponseContent({ other: "value" })).toBe('{"other":"value"}');
  });

  it("JSON-stringifies null", () => {
    expect(extractResponseContent(null)).toBe("null");
  });
});
