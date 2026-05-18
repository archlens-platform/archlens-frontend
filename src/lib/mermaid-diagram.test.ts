import { describe, it, expect, beforeEach } from "vitest";
import {
  applyAutoComponentStyles,
  applyComponentStyles,
  applyEdgeLabelStyles,
  buildMermaidSyntax,
  darkTypeStyles,
  getMermaidThemeVars,
  getNodeShape,
  getStyleKey,
  sanitizeId,
  typeStyles,
} from "./mermaid-diagram";
import type { ComponentDto, ConnectionDto } from "@/types";

describe("sanitizeId", () => {
  it("replaces non-alphanumeric characters with underscores", () => {
    expect(sanitizeId("API Gateway!")).toBe("API_Gateway_");
  });

  it("truncates ids to 40 characters", () => {
    const long = "a".repeat(60);
    expect(sanitizeId(long)).toHaveLength(40);
  });

  it('returns "node" as fallback when the input has no valid characters', () => {
    expect(sanitizeId("!!!!")).toBe("____");
    expect(sanitizeId("")).toBe("node");
  });
});

describe("getNodeShape", () => {
  it("returns cylinder for database/storage/cache types", () => {
    expect(getNodeShape("database")).toEqual(["[(", ")]"]);
    expect(getNodeShape("Redis")).toEqual(["[(", ")]"]);
    expect(getNodeShape("MongoDB")).toEqual(["[(", ")]"]);
    expect(getNodeShape("PostgreSQL")).toEqual(["[(", ")]"]);
    expect(getNodeShape("object storage")).toEqual(["[(", ")]"]);
  });

  it("returns subroutine for queue/broker types", () => {
    expect(getNodeShape("queue")).toEqual(["[[", "]]"]);
    expect(getNodeShape("Kafka")).toEqual(["[[", "]]"]);
    expect(getNodeShape("RabbitMQ")).toEqual(["[[", "]]"]);
    expect(getNodeShape("event broker")).toEqual(["[[", "]]"]);
  });

  it("returns hexagon for gateway/proxy/cdn types", () => {
    expect(getNodeShape("API gateway")).toEqual(["{{", "}}"]);
    expect(getNodeShape("load balancer")).toEqual(["{{", "}}"]);
    expect(getNodeShape("nginx proxy")).toEqual(["{{", "}}"]);
    expect(getNodeShape("cdn")).toEqual(["{{", "}}"]);
  });

  it("returns stadium for client/frontend types", () => {
    expect(getNodeShape("frontend")).toEqual(["([", "])"]);
    expect(getNodeShape("Web App")).toEqual(["([", "])"]);
    expect(getNodeShape("mobile client")).toEqual(["([", "])"]);
    expect(getNodeShape("UI")).toEqual(["([", "])"]);
  });

  it("returns rectangle as default shape", () => {
    expect(getNodeShape("service")).toEqual(["[", "]"]);
    expect(getNodeShape("microservice")).toEqual(["[", "]"]);
    expect(getNodeShape("unknown")).toEqual(["[", "]"]);
  });
});

describe("getStyleKey", () => {
  it("matches direct keys from typeStyles", () => {
    expect(getStyleKey("service")).toBe("service");
    expect(getStyleKey("database")).toBe("database");
    expect(getStyleKey("frontend")).toBe("frontend");
  });

  it("infers database from short db aliases", () => {
    expect(getStyleKey("MongoDB")).toBe("database");
    expect(getStyleKey("MySQL Cluster")).toBe("database");
  });

  it("infers queue from broker brand names", () => {
    expect(getStyleKey("Kafka cluster")).toBe("queue");
    expect(getStyleKey("RabbitMQ")).toBe("queue");
    expect(getStyleKey("AWS SQS")).toBe("queue");
  });

  it("infers cache from redis-like names", () => {
    expect(getStyleKey("Redis")).toBe("cache");
    expect(getStyleKey("Memcache")).toBe("cache");
  });

  it("infers frontend from app/ui keywords", () => {
    expect(getStyleKey("Mobile app")).toBe("frontend");
    expect(getStyleKey("Web UI")).toBe("frontend");
  });

  it("infers load_balancer from proxy keywords", () => {
    expect(getStyleKey("Nginx")).toBe("load_balancer");
    expect(getStyleKey("HAProxy load")).toBe("load_balancer");
  });

  it("falls back to default", () => {
    expect(getStyleKey("xyz")).toBe("default");
  });
});

describe("buildMermaidSyntax", () => {
  it("returns a graph header even when nothing is rendered", () => {
    expect(buildMermaidSyntax([], [])).toBe("graph TD");
  });

  it("emits a sanitized node for each component", () => {
    const syntax = buildMermaidSyntax(
      [{ name: "API Gateway", type: "gateway", description: "", confidence: 1 }],
      [],
    );
    expect(syntax).toContain("API_Gateway");
    expect(syntax).toContain('"API Gateway"');
    expect(syntax).toContain("{{");
  });

  it("disambiguates components that collapse to the same id", () => {
    const components: ComponentDto[] = [
      { name: "auth!", type: "service", description: "", confidence: 1 },
      { name: "auth@", type: "service", description: "", confidence: 1 },
      { name: "auth#", type: "service", description: "", confidence: 1 },
    ];
    const syntax = buildMermaidSyntax(components, []);
    expect(syntax).toContain("auth_2");
    expect(syntax).toContain("auth_3");
  });

  it("draws edges between components and uses the connection type as label", () => {
    const components: ComponentDto[] = [
      { name: "Gateway", type: "gateway", description: "", confidence: 1 },
      { name: "Users", type: "service", description: "", confidence: 1 },
    ];
    const connections: ConnectionDto[] = [
      { source: "Gateway", target: "Users", type: "REST", description: "" },
    ];
    const syntax = buildMermaidSyntax(components, connections);
    expect(syntax).toContain("-->|REST|");
  });

  it("omits the label for placeholder types", () => {
    const components: ComponentDto[] = [
      { name: "A", type: "service", description: "", confidence: 1 },
      { name: "B", type: "service", description: "", confidence: 1 },
    ];
    expect(
      buildMermaidSyntax(components, [
        { source: "A", target: "B", type: "unknown", description: "" },
      ]),
    ).toContain("--> B");
    expect(
      buildMermaidSyntax(components, [
        { source: "A", target: "B", type: "Not specified", description: "" },
      ]),
    ).toContain("--> B");
  });

  it("deduplicates repeated edges", () => {
    const components: ComponentDto[] = [
      { name: "A", type: "service", description: "", confidence: 1 },
      { name: "B", type: "service", description: "", confidence: 1 },
    ];
    const syntax = buildMermaidSyntax(components, [
      { source: "A", target: "B", type: "REST", description: "" },
      { source: "A", target: "B", type: "REST", description: "" },
    ]);
    const edges = syntax.split("\n").filter((line) => line.includes("-->"));
    expect(edges).toHaveLength(1);
  });

  it("ignores self-loops and unresolved endpoints", () => {
    const components: ComponentDto[] = [
      { name: "A", type: "service", description: "", confidence: 1 },
    ];
    const syntax = buildMermaidSyntax(components, [
      { source: "A", target: "A", type: "REST", description: "" },
      { source: "Ghost", target: "A", type: "REST", description: "" },
    ]);
    expect(syntax).not.toContain("-->");
  });

  it("caps connections at the configured maximum", () => {
    const components: ComponentDto[] = Array.from({ length: 40 }, (_, i) => ({
      name: `S${i}`,
      type: "service",
      description: "",
      confidence: 1,
    }));
    const connections: ConnectionDto[] = Array.from({ length: 40 }, (_, i) => ({
      source: `S${i}`,
      target: `S${(i + 1) % 40}`,
      type: "REST",
      description: "",
    }));

    const syntax = buildMermaidSyntax(components, connections);
    const edges = syntax.split("\n").filter((line) => line.includes("-->"));
    expect(edges).toHaveLength(30);
  });

  it("matches connection endpoints via substring lookup", () => {
    const components: ComponentDto[] = [
      { name: "Auth Service", type: "service", description: "", confidence: 1 },
      { name: "Users DB", type: "database", description: "", confidence: 1 },
    ];
    const syntax = buildMermaidSyntax(components, [
      { source: "auth", target: "Users", type: "SQL", description: "" },
    ]);
    expect(syntax).toContain("-->|SQL|");
  });
});

describe("getMermaidThemeVars", () => {
  it("uses cyan-flavored colors in light mode", () => {
    const light = getMermaidThemeVars(false);
    expect(light.primaryColor).toBe("#0891b2");
    expect(light.background).toBe("transparent");
  });

  it("uses navy-flavored colors in dark mode", () => {
    const dark = getMermaidThemeVars(true);
    expect(dark.primaryColor).toBe("#0e4d5e");
  });
});

describe("typeStyles and darkTypeStyles aliases", () => {
  it("expose alias keys mapped to base styles", () => {
    expect(typeStyles.api).toBe(typeStyles.service);
    expect(typeStyles.broker).toBe(typeStyles.queue);
    expect(typeStyles.storage).toBe(typeStyles.database);
    expect(typeStyles.client).toBe(typeStyles.frontend);
    expect(typeStyles.cdn).toBe(typeStyles.load_balancer);

    expect(darkTypeStyles.api).toBe(darkTypeStyles.service);
    expect(darkTypeStyles.storage).toBe(darkTypeStyles.database);
  });
});

describe("applyComponentStyles", () => {
  it("injects inline style attributes for known components", () => {
    const svg = '<svg><g id="flowchart-Gateway-1"></g></svg>';
    const styled = applyComponentStyles(
      svg,
      [{ name: "Gateway", type: "gateway", description: "", confidence: 1 }],
      false,
    );
    expect(styled).toContain('style="fill:#7c3aed;stroke:#a855f7;color:#fff"');
    expect(styled).toContain('id="flowchart-Gateway-1"');
  });

  it("supports dark mode palette", () => {
    const svg = '<svg><g id="flowchart-DB-1"></g></svg>';
    const styled = applyComponentStyles(
      svg,
      [{ name: "DB", type: "database", description: "", confidence: 1 }],
      true,
    );
    expect(styled).toContain("fill:#064e3b");
  });

  it("leaves the svg untouched when the component id is not present", () => {
    const svg = '<svg><g id="flowchart-Other-1"></g></svg>';
    const styled = applyComponentStyles(
      svg,
      [{ name: "Gateway", type: "gateway", description: "", confidence: 1 }],
      false,
    );
    expect(styled).toBe(svg);
  });
});

describe("applyAutoComponentStyles", () => {
  function makeSvg(html: string): SVGElement {
    document.body.innerHTML = `<svg>${html}</svg>`;
    return document.body.querySelector("svg") as unknown as SVGElement;
  }

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("colors nodes based on their label content", () => {
    const svg = makeSvg(
      '<g class="node"><span class="nodeLabel">Database Primary</span><rect></rect></g>',
    );
    applyAutoComponentStyles(svg, false);
    const rect = svg.querySelector("rect") as SVGElement;
    expect(rect.style.fill).toBe("#059669");
    expect(rect.style.stroke).toBe("#10b981");
  });

  it("skips nodes without a readable label", () => {
    const svg = makeSvg('<g class="node"><rect></rect></g>');
    applyAutoComponentStyles(svg, false);
    const rect = svg.querySelector("rect") as SVGElement;
    expect(rect.style.fill).toBe("");
  });

  it("falls back to the foreignObject span when other labels are missing", () => {
    const svg = makeSvg(
      '<g class="node"><foreignObject><span>API Gateway</span></foreignObject><rect></rect></g>',
    );
    applyAutoComponentStyles(svg, true);
    const rect = svg.querySelector("rect") as SVGElement;
    expect(rect.style.fill).toBe("#4c1d95");
  });
});

describe("applyEdgeLabelStyles", () => {
  it("prepends an inline style element with theme-specific colors", () => {
    document.body.innerHTML = "<svg></svg>";
    const svg = document.body.querySelector("svg") as unknown as SVGElement;
    applyEdgeLabelStyles(svg, false);
    const style = svg.firstChild as SVGStyleElement;
    expect(style.tagName.toLowerCase()).toBe("style");
    expect(style.textContent).toContain("#475569");

    document.body.innerHTML = "<svg></svg>";
    const darkSvg = document.body.querySelector("svg") as unknown as SVGElement;
    applyEdgeLabelStyles(darkSvg, true);
    expect((darkSvg.firstChild as SVGStyleElement).textContent).toContain("#6b7280");
  });
});
