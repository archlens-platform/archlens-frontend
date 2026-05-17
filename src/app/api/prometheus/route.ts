import { NextRequest, NextResponse } from "next/server";

const PROMETHEUS_URL =
  process.env.INTERNAL_PROMETHEUS_URL ||
  process.env.PROMETHEUS_INTERNAL_URL ||
  "http://localhost:9090";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "query parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?${new URLSearchParams({ query })}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", error: `Prometheus returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Prometheus not available";
    return NextResponse.json(
      { status: "error", error: detail },
      { status: 502 }
    );
  }
}
