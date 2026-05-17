"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { ComponentDto, ConnectionDto } from "@/types";
import {
  buildMermaidSyntax,
  getMermaidThemeVars,
  applyComponentStyles,
  applyEdgeLabelStyles,
} from "@/lib/mermaid-diagram";

interface ArchitectureDiagramProps {
  readonly components: ComponentDto[];
  readonly connections: ConnectionDto[];
}

function useRenderMermaid(
  ref: React.RefObject<HTMLDivElement | null>,
  components: ComponentDto[],
  connections: ConnectionDto[],
  isDark: boolean,
) {
  const [error, setError] = useState(false);
  const svgRef = useRef<string>("");

  useEffect(() => {
    if (!ref.current || components.length === 0) return;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: getMermaidThemeVars(isDark),
          securityLevel: "loose",
          flowchart: { htmlLabels: true, curve: "basis", padding: 15, nodeSpacing: 50, rankSpacing: 60 },
        });

        const syntax = buildMermaidSyntax(components, connections);
        const uniqueId = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, syntax);

        const styledSvg = applyComponentStyles(svg, components, isDark);

        svgRef.current = styledSvg;
        if (ref.current) {
          ref.current.innerHTML = styledSvg;
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            applyEdgeLabelStyles(svgEl, isDark);
          }
        }
      } catch {
        setError(true);
      }
    };

    renderDiagram();
  }, [ref, components, connections, isDark]);

  return { error, svgContent: svgRef };
}

export function ArchitectureDiagram({ components, connections }: ArchitectureDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { error, svgContent } = useRenderMermaid(containerRef, components, connections, isDark);

  useEffect(() => {
    if (containerRef.current) {
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("height");
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.style.maxWidth = "none";
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
    }
  });

  useEffect(() => {
    if (expanded && fullscreenRef.current && svgContent.current) {
      fullscreenRef.current.innerHTML = svgContent.current;
      const svgEl = fullscreenRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("height");
        svgEl.removeAttribute("width");
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.style.maxWidth = "none";
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      setZoom(1);
    }
  }, [expanded, svgContent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.3, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  if (components.length === 0) return null;
  if (error) return null;

  return (
    <>
      <div className="relative group">
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-background via-muted/30 to-background h-[300px] [&_svg]:object-contain"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-0 shadow-lg transition-all hover:bg-primary group-hover:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          Expand
        </button>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
            aria-label="Close fullscreen"
          />
          <div
            className="relative flex flex-col rounded-2xl border border-border/50 bg-background shadow-2xl"
            style={{ width: "90vw", height: "85vh" }}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Zoom: {Math.round(zoom * 100)}% — Scroll to zoom
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-auto"
              onWheel={handleWheel}
            >
              <div
                ref={fullscreenRef}
                className="flex items-center justify-center origin-center transition-transform duration-150 p-6"
                style={{
                  transform: `scale(${zoom})`,
                  minWidth: "100%",
                  minHeight: "100%",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
