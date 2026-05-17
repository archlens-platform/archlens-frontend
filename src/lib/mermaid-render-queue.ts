import { getMermaidThemeVars } from "@/lib/mermaid-diagram";

let mermaidMod: typeof import("mermaid") | null = null;
let lastTheme: string | null = null;
let queue: Promise<void> = Promise.resolve();

function cleanup(uid: string) {
  document.querySelectorAll(`[id^="${uid}"], [id^="d${uid}"]`).forEach((el) => {
    if (el.parentElement === document.body) el.remove();
  });
}

async function freshInit(isDark: boolean) {
  if (!mermaidMod) {
    mermaidMod = await import("mermaid");
  }

  mermaidMod.default.initialize({
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
  lastTheme = isDark ? "dark" : "light";
}

export function renderMermaid(code: string, isDark: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    queue = queue
      .then(async () => {
        const theme = isDark ? "dark" : "light";
        if (!mermaidMod || lastTheme !== theme) {
          await freshInit(isDark);
        }

        const clean = code
          .replaceAll(/```mermaid\n?/g, "")
          .replaceAll(/```\n?/g, "")
          .trim();

        const uid = `mm_${Math.random().toString(36).slice(2, 10)}`;

        try {
          const { svg } = await mermaidMod!.default.render(uid, clean);
          cleanup(uid);
          resolve(svg);
        } catch (err) {
          cleanup(uid);
          await freshInit(isDark);
          reject(err);
        }
      })
      .catch(() => {});
  });
}
