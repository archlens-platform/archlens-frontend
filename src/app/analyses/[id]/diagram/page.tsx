"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { getSagaStatus, getReportByAnalysis } from "@/lib/api";
import {
  buildMermaidSyntax,
  getMermaidThemeVars,
  applyComponentStyles,
  applyEdgeLabelStyles,
} from "@/lib/mermaid-diagram";

export default function DiagramPage() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const saga = useQuery({
    queryKey: ["saga", id],
    queryFn: () => getSagaStatus(id),
  });

  const report = useQuery({
    queryKey: ["report-by-analysis", saga.data?.analysisId],
    queryFn: () => getReportByAnalysis(saga.data?.analysisId ?? ""),
    enabled: !!saga.data?.analysisId && saga.data.currentState === "Completed",
  });

  const r = report.data;

  useEffect(() => {
    if (!canvasRef.current || !r || r.components.length === 0) return;

    const render = async () => {
      const mermaid = (await import("mermaid")).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: getMermaidThemeVars(isDark),
        securityLevel: "loose",
        flowchart: { htmlLabels: true, curve: "basis", padding: 15, nodeSpacing: 50, rankSpacing: 60 },
      });

      const syntax = buildMermaidSyntax(r.components, r.connections);
      const { svg } = await mermaid.render(`diagram-${Date.now()}`, syntax);

      const styledSvg = applyComponentStyles(svg, r.components, isDark);

      if (canvasRef.current) {
        canvasRef.current.innerHTML = styledSvg;
        const svgEl = canvasRef.current.querySelector("svg");
        if (svgEl) {
          applyEdgeLabelStyles(svgEl, isDark);
        }
      }
    };

    render();
  }, [r, isDark]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.2, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const pageRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleBack = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  if (saga.isLoading || report.isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = saga.data?.fileName
    ? saga.data.fileName.replace(/\.[^/.]+$/, "").replaceAll(/[-_]/g, " ").replaceAll(/\b\w/g, (c) => c.toUpperCase())
    : "Architecture Diagram";

  return (
    <div ref={pageRef} className="flex h-[calc(100vh-5rem)] flex-col -mx-4 -my-6 bg-background">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href={`/analyses/${id}`} onClick={handleBack}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold">{title}</h1>
          <span className="text-xs text-muted-foreground">
            {r?.components.length ?? 0} components, {r?.connections.length ?? 0} connections
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(5, z + 0.25))} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView} title="Reset view">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="flex-1 overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          ref={canvasRef}
          className="flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.15s ease-out",
            minWidth: "100%",
            minHeight: "100%",
            padding: "2rem",
          }}
        />
      </div>
    </div>
  );
}
