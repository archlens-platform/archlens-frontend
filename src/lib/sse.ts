export function tryParseContent(text: string): string | null {
  if (!text.startsWith("{")) return null;
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    return typeof obj.content === "string" ? obj.content : null;
  } catch {
    return null;
  }
}

export function parseSSEContent(raw: string): string {
  const lines = raw.split("\n");
  const parts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ")) {
      const payload = trimmed.slice(6).trim();
      if (payload === "[DONE]") continue;
      const content = tryParseContent(payload);
      parts.push(content ?? payload);
    }
  }
  return parts.join("") || raw;
}

export function extractResponseContent(data: unknown): string {
  if (typeof data === "string") {
    return parseSSEContent(data);
  }
  const obj = data as Record<string, unknown> | null;
  return (typeof obj?.content === "string" ? obj.content : null) ?? JSON.stringify(data);
}
