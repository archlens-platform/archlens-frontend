"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { renderMermaid } from "@/lib/mermaid-render-queue";
import {
  applyComponentStyles,
  applyAutoComponentStyles,
  applyEdgeLabelStyles,
} from "@/lib/mermaid-diagram";
import type { ComponentDto } from "@/types";

interface MermaidRendererProps {
  readonly code: string;
  readonly className?: string;
  readonly components?: ComponentDto[];
  readonly onRenderError?: () => void;
}

const MAX_RETRIES = 3;

export function MermaidRenderer({ code, className, components, onRenderError }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const renderToRef = useCallback(async (): Promise<boolean> => {
    try {
      let svg = await renderMermaid(code, isDark);

      if (!ref.current) return false;

      if (components?.length) {
        svg = applyComponentStyles(svg, components, isDark);
      }

      ref.current.innerHTML = svg;

      const svgEl = ref.current.querySelector("svg");
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
        applyEdgeLabelStyles(svgEl, isDark);

        if (!components?.length) {
          applyAutoComponentStyles(svgEl, isDark);
        }
      }

      if (!isDark && ref.current) {
        ref.current
          .querySelectorAll(".edgeLabel text, .edgeLabel span, .edgeLabel p, .edgeLabel foreignObject span")
          .forEach((el) => {
            (el as HTMLElement).style.color = "#1e293b";
            (el as HTMLElement).style.fill = "#1e293b";
          });
      }

      return true;
    } catch (err) {
      console.warn("Mermaid render failed:", err);
      return false;
    }
  }, [code, isDark, components]);

  const runWithRetries = useCallback(async (signal: { cancelled: boolean }) => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (signal.cancelled) return;

      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }

      const success = await renderToRef();
      if (signal.cancelled) return;

      if (success) {
        setStatus("success");
        return;
      }
    }

    if (!signal.cancelled) {
      setStatus("error");
    }
  }, [renderToRef]);

  useEffect(() => {
    if (!code) return;

    const signal = { cancelled: false };
    setStatus("loading");
    runWithRetries(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [code, isDark, components, runWithRetries]);

  const handleRetry = useCallback(() => {
    if (onRenderError) {
      onRenderError();
      return;
    }
    setStatus("loading");
    runWithRetries({ cancelled: false });
  }, [onRenderError, runWithRetries]);

  const containerClass =
    className ??
    "flex justify-center overflow-auto rounded-lg bg-slate-100 dark:bg-slate-900/50 p-4 min-h-[300px] [&_svg]:max-w-full";

  return (
    <div className={containerClass}>
      <div ref={ref} className={status === "success" ? "w-full" : "w-full h-0 overflow-hidden"} />

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Rendering diagram...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-muted-foreground">Failed to render diagram</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            {onRenderError
              ? "The AI generated invalid Mermaid syntax. Click below to regenerate."
              : "A rendering error occurred. Click below to retry."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {onRenderError ? "Regenerate" : "Retry"}
          </button>
        </div>
      )}
    </div>
  );
}
