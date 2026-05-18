import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockInitialize, mockRender } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock("mermaid", () => ({
  default: { initialize: mockInitialize, render: mockRender },
}));

beforeEach(() => {
  vi.resetModules();
  mockInitialize.mockClear();
  mockRender.mockClear();
  mockRender.mockImplementation(async (uid: string) => {
    document.body.insertAdjacentHTML("beforeend", `<div id="${uid}"></div>`);
    document.body.insertAdjacentHTML("beforeend", `<div id="d${uid}"></div>`);
    return { svg: `<svg data-uid="${uid}"></svg>` };
  });
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderMermaid", () => {
  it("initializes mermaid once and returns the rendered svg", async () => {
    const { renderMermaid } = await import("./mermaid-render-queue");
    const svg = await renderMermaid("graph TD; A-->B", false);
    expect(svg).toContain("<svg");
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
      }),
    );
  });

  it("strips ```mermaid fences before rendering", async () => {
    const { renderMermaid } = await import("./mermaid-render-queue");
    await renderMermaid("```mermaid\ngraph TD; A-->B\n```", false);
    const [, code] = mockRender.mock.calls[0];
    expect(code).toBe("graph TD; A-->B");
  });

  it("reinitializes when the theme changes between calls", async () => {
    const { renderMermaid } = await import("./mermaid-render-queue");
    await renderMermaid("graph TD; A-->B", false);
    await renderMermaid("graph TD; A-->B", true);
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });

  it("does not reinitialize when the theme stays the same", async () => {
    const { renderMermaid } = await import("./mermaid-render-queue");
    await renderMermaid("graph TD; A-->B", false);
    await renderMermaid("graph TD; A-->C", false);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it("cleans up stray nodes inserted by mermaid after a successful render", async () => {
    const { renderMermaid } = await import("./mermaid-render-queue");
    await renderMermaid("graph TD; A-->B", false);
    expect(document.body.querySelectorAll('[id^="mm_"]').length).toBe(0);
    expect(document.body.querySelectorAll('[id^="dmm_"]').length).toBe(0);
  });

  it("rejects and reinitializes when mermaid throws during render", async () => {
    mockRender.mockRejectedValueOnce(new Error("boom"));
    const { renderMermaid } = await import("./mermaid-render-queue");
    await expect(renderMermaid("graph TD; A-->B", false)).rejects.toThrow("boom");
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });

  it("recovers and continues to honor subsequent calls after a failure", async () => {
    mockRender.mockRejectedValueOnce(new Error("first"));
    const { renderMermaid } = await import("./mermaid-render-queue");
    await expect(renderMermaid("graph TD; A", false)).rejects.toThrow("first");
    const svg = await renderMermaid("graph TD; A-->B", false);
    expect(svg).toContain("<svg");
  });
});
