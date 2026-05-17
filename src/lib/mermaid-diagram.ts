import type { ComponentDto, ConnectionDto } from "@/types";

export function sanitizeId(name: string): string {
  const base = name.replaceAll(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  return base || "node";
}

function sanitizeLabel(text: string): string {
  return text.replaceAll(/["|()[\]{}]/g, " ").trim();
}

function buildStyleMap(
  base: Record<string, string>,
  aliases: Record<string, string>,
): Record<string, string> {
  const map = { ...base };
  for (const [alias, target] of Object.entries(aliases)) {
    map[alias] = base[target];
  }
  return map;
}

const styleAliases: Record<string, string> = {
  api: "service",
  broker: "queue",
  storage: "database",
  client: "frontend",
  cdn: "load_balancer",
};

export const typeStyles = buildStyleMap(
  {
    service: "fill:#0891b2,stroke:#06b6d4,color:#fff",
    gateway: "fill:#7c3aed,stroke:#a855f7,color:#fff",
    database: "fill:#059669,stroke:#10b981,color:#fff",
    queue: "fill:#d97706,stroke:#f59e0b,color:#fff",
    cache: "fill:#dc2626,stroke:#ef4444,color:#fff",
    frontend: "fill:#db2777,stroke:#ec4899,color:#fff",
    load_balancer: "fill:#7c3aed,stroke:#a855f7,color:#fff",
    default: "fill:#0e7490,stroke:#22d3ee,color:#fff",
  },
  styleAliases,
);

export const darkTypeStyles = buildStyleMap(
  {
    service: "fill:#0e4d5e,stroke:#00d4ff,color:#e8eaf0",
    gateway: "fill:#4c1d95,stroke:#a855f7,color:#e8eaf0",
    database: "fill:#064e3b,stroke:#10b981,color:#e8eaf0",
    queue: "fill:#78350f,stroke:#f59e0b,color:#e8eaf0",
    cache: "fill:#7f1d1d,stroke:#ef4444,color:#e8eaf0",
    frontend: "fill:#831843,stroke:#ec4899,color:#e8eaf0",
    load_balancer: "fill:#4c1d95,stroke:#a855f7,color:#e8eaf0",
    default: "fill:#164e63,stroke:#00d4ff,color:#e8eaf0",
  },
  styleAliases,
);

export function getNodeShape(type: string): [string, string] {
  const t = type.toLowerCase();
  if (t.includes("database") || t.includes("db") || t.includes("storage") || t.includes("cache") || t.includes("redis") || t.includes("mongo") || t.includes("postgres"))
    return ["[(", ")]"];
  if (t.includes("queue") || t.includes("broker") || t.includes("kafka") || t.includes("rabbit"))
    return ["[[", "]]"];
  if (t.includes("gateway") || t.includes("load") || t.includes("proxy") || t.includes("cdn"))
    return ["{{", "}}"];
  if (t.includes("client") || t.includes("frontend") || t.includes("ui") || t.includes("web") || t.includes("mobile"))
    return ["([", "])"];
  return ["[", "]"];
}

export function getStyleKey(type: string): string {
  const t = type.toLowerCase();
  for (const key of Object.keys(typeStyles)) {
    if (t.includes(key)) return key;
  }
  if (t.includes("db") || t.includes("postgres") || t.includes("mongo") || t.includes("mysql"))
    return "database";
  if (t.includes("kafka") || t.includes("rabbit") || t.includes("sqs"))
    return "queue";
  if (t.includes("redis") || t.includes("memcache"))
    return "cache";
  if (t.includes("web") || t.includes("ui") || t.includes("mobile") || t.includes("app"))
    return "frontend";
  if (t.includes("proxy") || t.includes("load") || t.includes("nginx") || t.includes("balancer"))
    return "load_balancer";
  return "default";
}

export function buildMermaidSyntax(
  components: ComponentDto[],
  connections: ConnectionDto[],
): string {
  const lines: string[] = ["graph TD"];

  const compMap = new Map<string, { id: string; type: string }>();
  const usedIds = new Set<string>();
  components.forEach((c) => {
    let id = sanitizeId(c.name);
    if (usedIds.has(id)) {
      let i = 2;
      while (usedIds.has(`${id}_${i}`)) i++;
      id = `${id}_${i}`;
    }
    usedIds.add(id);
    compMap.set(c.name.toLowerCase(), { id, type: c.type });
    const [open, close] = getNodeShape(c.type);
    lines.push(`    ${id}${open}"${sanitizeLabel(c.name)}"${close}`);
  });

  const findId = (name: string): string | null => {
    const direct = compMap.get(name.toLowerCase());
    if (direct) return direct.id;
    for (const [key, val] of compMap) {
      if (key.includes(name.toLowerCase()) || name.toLowerCase().includes(key))
        return val.id;
    }
    return null;
  };

  const maxConnections = 30;
  const connsToRender = connections.length > maxConnections
    ? connections.slice(0, maxConnections)
    : connections;

  const rendered = new Set<string>();
  connsToRender.forEach((conn) => {
    const srcId = findId(conn.source);
    const tgtId = findId(conn.target);
    if (srcId && tgtId && srcId !== tgtId) {
      const edgeKey = `${srcId}->${tgtId}`;
      if (rendered.has(edgeKey)) return;
      rendered.add(edgeKey);
      const rawType = conn.type ?? "";
      const label = rawType && rawType !== "unknown" && rawType !== "Not specified"
        ? `|${sanitizeLabel(rawType)}|`
        : "";
      lines.push(`    ${srcId} -->${label} ${tgtId}`);
    }
  });

  return lines.join("\n");
}

export function getMermaidThemeVars(isDark: boolean): Record<string, string> {
  return {
    primaryColor: isDark ? "#0e4d5e" : "#0891b2",
    primaryTextColor: isDark ? "#e8eaf0" : "#ffffff",
    primaryBorderColor: isDark ? "#00d4ff" : "#06b6d4",
    lineColor: isDark ? "#6b7280" : "#475569",
    secondaryColor: isDark ? "#1a1d35" : "#e0e7ff",
    tertiaryColor: isDark ? "#1a1d35" : "#e0e7ff",
    background: "transparent",
    mainBkg: isDark ? "#0e4d5e" : "#0891b2",
    nodeBorder: isDark ? "#00d4ff" : "#06b6d4",
    clusterBkg: isDark ? "#111430" : "#e8eef4",
    clusterBorder: isDark ? "#334155" : "#94a3b8",
    titleColor: isDark ? "#e8eaf0" : "#1e293b",
    edgeLabelBackground: isDark ? "#1a1d35" : "#e8eef4",
    nodeTextColor: isDark ? "#e8eaf0" : "#ffffff",
  };
}

export function applyComponentStyles(svg: string, components: ComponentDto[], isDark: boolean): string {
  const styles = isDark ? darkTypeStyles : typeStyles;
  let styledSvg = svg;
  components.forEach((c) => {
    const id = sanitizeId(c.name);
    const key = getStyleKey(c.type);
    const style = styles[key] ?? styles.default;
    const [fillMatch] = style.match(/fill:[^,]+/) ?? [""];
    const [strokeMatch] = style.match(/stroke:[^,]+/) ?? [""];
    const [colorMatch] = style.match(/color:[^,]+/) ?? [""];
    if (fillMatch && strokeMatch && colorMatch) {
      styledSvg = styledSvg.replaceAll(
        `id="flowchart-${id}-`,
        `style="${fillMatch};${strokeMatch};${colorMatch}" id="flowchart-${id}-`,
      );
    }
  });
  return styledSvg;
}

export function applyAutoComponentStyles(svgEl: SVGElement, isDark: boolean): void {
  const styles = isDark ? darkTypeStyles : typeStyles;

  svgEl.querySelectorAll(".node").forEach((node) => {
    const label =
      node.querySelector(".nodeLabel")?.textContent?.trim() ??
      node.querySelector("text")?.textContent?.trim() ??
      node.querySelector("foreignObject span")?.textContent?.trim() ??
      "";
    if (!label) return;

    const key = getStyleKey(label);
    const style = styles[key] ?? styles.default;
    const fill = style.match(/fill:([^,]+)/)?.[1] ?? "";
    const stroke = style.match(/stroke:([^,]+)/)?.[1] ?? "";

    const shape = node.querySelector("rect, polygon, circle, .label-container");
    if (shape && fill && stroke) {
      (shape as SVGElement).style.fill = fill;
      (shape as SVGElement).style.stroke = stroke;
    }
  });
}

export function applyEdgeLabelStyles(svgEl: SVGElement, isDark: boolean): void {
  const bg = isDark ? "#2d1b3d" : "#f3e0f7";
  const border = isDark ? "#6b3a7d" : "#c084d8";
  const text = isDark ? "#fff" : "#1a1a2e";
  const lineColor = isDark ? "#6b7280" : "#475569";
  const clusterBg = isDark ? "rgba(30, 41, 59, 0.3)" : "rgba(226, 232, 240, 0.35)";
  const clusterBorder = isDark ? "#334155" : "#94a3b8";
  const nodeText = isDark ? "#e8eaf0" : "#ffffff";
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    .edgePath path, .flowchart-link { fill: none !important; stroke: ${lineColor} !important; stroke-width: 1.5px !important; }
    marker path { stroke: none !important; }
    .cluster rect { fill: ${clusterBg} !important; stroke: ${clusterBorder} !important; stroke-width: 1px !important; opacity: 1 !important; }
    .cluster span, .cluster text { opacity: 1 !important; fill: ${isDark ? "#94a3b8" : "#475569"} !important; color: ${isDark ? "#94a3b8" : "#475569"} !important; }
    .node .label, .node text, .node span, .node p { color: ${nodeText} !important; fill: ${nodeText} !important; }
    .node foreignObject div { color: ${nodeText} !important; }
    .edgeLabel rect { fill: ${bg} !important; stroke: ${border} !important; stroke-width: 1.5px !important; rx: 6 !important; ry: 6 !important; opacity: 1 !important; }
    .edgeLabel span, .edgeLabel p { color: ${text} !important; font-size: 11px !important; font-weight: 600 !important; background: transparent !important; border: none !important; }
    .edgeLabel tspan, .edgeLabel text { fill: ${text} !important; font-size: 11px !important; font-weight: 600 !important; }
    .edgeLabel foreignObject div { background: transparent !important; color: ${text} !important; border: none !important; }
  `;
  svgEl.prepend(styleEl);
}
