"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import {
  Wand2,
  Download,
  Loader2,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateFixedDiagram, getReportByAnalysis } from "@/lib/api";
import {
  buildMermaidSyntax,
  getMermaidThemeVars,
  applyComponentStyles,
  applyAutoComponentStyles,
  applyEdgeLabelStyles,
} from "@/lib/mermaid-diagram";
import { toast } from "sonner";

async function initMermaid(isDark: boolean) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: getMermaidThemeVars(isDark),
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 60,
    },
    securityLevel: "loose",
    suppressErrorRendering: true,
  });
  return mermaid;
}

async function renderDiagramToRef(
  mermaid: typeof import("mermaid").default,
  ref: HTMLDivElement,
  code: string,
): Promise<void> {
  const clean = code
    .replaceAll(/```mermaid\n?/g, "")
    .replaceAll(/```\n?/g, "")
    .trim();

  const uid = `mm_${Math.random().toString(36).slice(2, 10)}`;
  const { svg } = await mermaid.render(uid, clean);

  ref.innerHTML = svg;

  const svgEl = ref.querySelector("svg");
  if (svgEl) {
    svgEl.removeAttribute("id");
    if (!svgEl.getAttribute("viewBox")) {
      const w = svgEl.getAttribute("width") || svgEl.getBoundingClientRect().width;
      const h = svgEl.getAttribute("height") || svgEl.getBoundingClientRect().height;
      svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    svgEl.removeAttribute("height");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.maxWidth = "100%";
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  document.querySelectorAll(`#${uid}, #d${uid}`).forEach((el) => {
    if (el.parentElement === document.body) el.remove();
  });
}

export default function FixDiagramPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysisId") ?? "";
  const diagramName = searchParams.get("name") ?? "Diagram";

  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [expanded, setExpanded] = useState<"original" | "corrected" | null>(null);

  const [origStatus, setOrigStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [fixedStatus, setFixedStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const compareRef = useRef<HTMLDivElement>(null);
  const origRef = useRef<HTMLDivElement>(null);
  const fixedRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const friendlyName = diagramName
    .replace(/\.[^/.]+$/, "")
    .replaceAll(/[-_]/g, " ")
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());

  const report = useQuery({
    queryKey: ["report-fix", analysisId],
    queryFn: () => getReportByAnalysis(analysisId),
    enabled: !!analysisId,
  });

  const r = report.data;

  const originalMermaid = useMemo(() => {
    if (!r?.components.length) return null;
    return buildMermaidSyntax(r.components, r.connections);
  }, [r]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateFixedDiagram(analysisId, diagramName, r ?? null);
      setMermaidCode(result.mermaid);
      setProvider(result.provider);
      setGenerated(true);
      setRenderKey((k) => k + 1);
      toast.success("Corrected diagram generated!");
    } catch {
      toast.error("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!compareRef.current) return;
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      toast.info("Exporting PDF...");

      const canvas = await html2canvas(compareRef.current, {
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        scale: 2,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgW = canvas.width;
      const imgH = canvas.height;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [imgW + 80, imgH + 140],
      });

      pdf.setFontSize(24);
      pdf.setTextColor(6, 182, 212);
      pdf.text("ArchLens - Before vs After", 40, 45);
      pdf.setFontSize(14);
      pdf.setTextColor(148, 163, 184);
      pdf.text(friendlyName, 40, 70);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Corrected by ${provider ?? "AI"} | All recommendations applied`, 40, 90);
      pdf.addImage(imgData, "PNG", 40, 110, imgW, imgH);

      const safeName = diagramName.replaceAll(/[^a-zA-Z0-9-_]/g, "_");
      pdf.save(`archlens-before-after-${safeName}.pdf`);
      toast.success("PDF exported!");
    } catch {
      toast.error("Failed to export PDF.");
    }
  };

  useEffect(() => {
    if (!generated || !originalMermaid || !origRef.current) return;

    let cancelled = false;
    setOrigStatus("loading");
    setFixedStatus(mermaidCode ? "loading" : "idle");

    const run = async () => {
      const mermaid = await initMermaid(isDark);

      try {
        await renderDiagramToRef(mermaid, origRef.current!, originalMermaid);
        if (cancelled) return;

        if (r?.components) {
          const svg = applyComponentStyles(origRef.current!.innerHTML, r.components, isDark);
          origRef.current!.innerHTML = svg;
        }
        const origSvg = origRef.current!.querySelector("svg");
        if (origSvg) {
          applyEdgeLabelStyles(origSvg, isDark);
        }

        setOrigStatus("ok");
      } catch {
        if (!cancelled) setOrigStatus("error");
      }

      if (mermaidCode && fixedRef.current && !cancelled) {
        try {
          await renderDiagramToRef(mermaid, fixedRef.current!, mermaidCode);
          if (cancelled) return;

          const fixedSvg = fixedRef.current!.querySelector("svg");
          if (fixedSvg) {
            applyEdgeLabelStyles(fixedSvg, isDark);
            applyAutoComponentStyles(fixedSvg, isDark);
          }

          setFixedStatus("ok");
        } catch {
          if (!cancelled) setFixedStatus("error");
        }
      }

      if (!isDark) {
        [origRef.current, fixedRef.current].forEach((el) => {
          el?.querySelectorAll(".edgeLabel text, .edgeLabel span, .edgeLabel p, .edgeLabel foreignObject span")
            .forEach((e) => {
              (e as HTMLElement).style.color = "#1e293b";
              (e as HTMLElement).style.fill = "#1e293b";
            });
        });
      }
    };

    run();

    return () => { cancelled = true; };
  }, [generated, originalMermaid, mermaidCode, isDark, r, renderKey]);

  const renderExpanded = useCallback(async () => {
    if (!expandedRef.current) return;
    const code = expanded === "original" ? originalMermaid : mermaidCode;
    if (!code) return;

    try {
      const mermaid = await initMermaid(isDark);
      await renderDiagramToRef(mermaid, expandedRef.current, code);

      if (expanded === "original" && r?.components) {
        const svg = applyComponentStyles(expandedRef.current.innerHTML, r.components, isDark);
        expandedRef.current.innerHTML = svg;
      }

      const svgEl = expandedRef.current.querySelector("svg");
      if (svgEl) {
        applyEdgeLabelStyles(svgEl, isDark);
        if (expanded === "corrected") {
          applyAutoComponentStyles(svgEl, isDark);
        }
      }
    } catch {
      if (expandedRef.current) {
        expandedRef.current.innerHTML = '<p class="text-sm text-muted-foreground p-6">Failed to render diagram.</p>';
      }
    }
  }, [expanded, originalMermaid, mermaidCode, isDark, r]);

  useEffect(() => {
    if (expanded) {
      renderExpanded();
    }
  }, [expanded, renderExpanded]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.05] via-transparent to-purple-500/[0.05] pointer-events-none" />
          <CardContent className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <Link href={`/analyses/${id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Wand2 className="h-6 w-6 text-primary" />
                  Fix & Export
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">{friendlyName}</p>
              </div>
            </div>
            {generated && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
                  onClick={handleExportPdf}
                  disabled={loading}
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!generated && !loading && (
          <Card className="border-dashed border-2 border-primary/20">
            <CardContent className="flex flex-col items-center gap-6 py-20">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <Wand2 className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute inset-0 h-20 w-20 rounded-full bg-primary/5 animate-ping" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Generate Corrected Diagram</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  The AI will analyze all identified risks and recommendations, then generate
                  an improved architecture diagram with the fixes applied.
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20"
                onClick={handleGenerate}
              >
                <Wand2 className="h-5 w-5" />
                Generate Corrected Diagram
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-20">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/10" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">AI is generating the corrected diagram...</p>
                <p className="text-xs text-muted-foreground">Applying all recommendations and fixing identified risks</p>
              </div>
            </CardContent>
          </Card>
        )}

        {generated && !loading && (
          <div ref={compareRef} className="space-y-6">
            {r && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-destructive/20 bg-destructive/[0.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Before — Original Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center rounded-lg bg-destructive/5 p-3">
                        <span className="text-2xl font-bold text-destructive">{r.overallScore.toFixed(1)}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Score</p>
                      </div>
                      <div className="text-center rounded-lg bg-destructive/5 p-3">
                        <span className="text-2xl font-bold text-destructive">{r.risks.length}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Risks</p>
                      </div>
                      <div className="text-center rounded-lg bg-destructive/5 p-3">
                        <span className="text-2xl font-bold text-destructive">{r.components.length}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Components</p>
                      </div>
                    </div>
                    {r.risks.slice(0, 3).map((risk) => (
                      <div key={`${risk.title}-${risk.severity}`} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive shrink-0">{risk.severity}</Badge>
                        <span className="truncate text-muted-foreground">{risk.title}</span>
                      </div>
                    ))}
                    {r.risks.length > 3 && <p className="text-[10px] text-muted-foreground">+{r.risks.length - 3} more risks...</p>}
                  </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      After — Recommendations Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center rounded-lg bg-emerald-500/5 p-3">
                        <span className="text-2xl font-bold text-emerald-500">Fixed</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Score</p>
                      </div>
                      <div className="text-center rounded-lg bg-emerald-500/5 p-3">
                        <span className="text-2xl font-bold text-emerald-500">0</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Risks</p>
                      </div>
                      <div className="text-center rounded-lg bg-emerald-500/5 p-3">
                        <span className="text-2xl font-bold text-emerald-500">{r.recommendations.length}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Fixes Applied</p>
                      </div>
                    </div>
                    {r.recommendations.slice(0, 3).map((rec) => (
                      <div key={rec} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate text-muted-foreground">{rec}</span>
                      </div>
                    ))}
                    {r.recommendations.length > 3 && <p className="text-[10px] text-muted-foreground">+{r.recommendations.length - 3} more fixes applied...</p>}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Original Diagram
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded("original")}>
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center overflow-auto rounded-lg bg-slate-100 dark:bg-slate-900/50 p-4 min-h-[300px]">
                    {origStatus === "loading" && (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Rendering...</p>
                      </div>
                    )}
                    {origStatus === "error" && (
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p className="text-sm font-medium text-muted-foreground">Failed to render diagram</p>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRenderKey((k) => k + 1)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </Button>
                      </div>
                    )}
                    <div ref={origRef} className={origStatus === "ok" ? "w-full" : "hidden"} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Corrected Diagram
                    <Badge variant="secondary" className="text-[10px]">{provider}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded("corrected")}>
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center overflow-auto rounded-lg bg-slate-100 dark:bg-slate-900/50 p-4 min-h-[300px]">
                    {fixedStatus === "loading" && (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Rendering...</p>
                      </div>
                    )}
                    {fixedStatus === "error" && (
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p className="text-sm font-medium text-muted-foreground">Failed to render diagram</p>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate}>
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </Button>
                      </div>
                    )}
                    <div ref={fixedRef} className={fixedStatus === "ok" ? "w-full" : "hidden"} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                {expanded === "original" ? (
                  <><AlertTriangle className="h-4 w-4 text-destructive" /> Original Diagram</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Corrected Diagram</>
                )}
              </h2>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setExpanded(null)}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div ref={expandedRef} className="flex justify-center" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
