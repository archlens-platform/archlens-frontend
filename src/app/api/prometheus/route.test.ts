import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

function createNextRequest(url: string) {
  const parsed = new URL(url);
  return {
    nextUrl: parsed,
  };
}

describe("Prometheus route", () => {
  it("returns 400 when no query parameter", async () => {
    const { GET } = await import("./route");
    const req = createNextRequest("http://localhost/api/prometheus");
    const res = await GET(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("query parameter required");
  });

  it("returns prometheus data on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "success", data: { result: [] } }),
    });

    const { GET } = await import("./route");
    const req = createNextRequest("http://localhost/api/prometheus?query=up");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
  });

  it("returns 502 when prometheus returns error status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "service unavailable" }),
    });

    const { GET } = await import("./route");
    const req = createNextRequest("http://localhost/api/prometheus?query=up");
    const res = await GET(req as never);
    expect(res.status).toBe(502);
  });

  it("returns 502 when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const { GET } = await import("./route");
    const req = createNextRequest("http://localhost/api/prometheus?query=up");
    const res = await GET(req as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("network error");
  });
});
