export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMarkdown(
  text: string,
  headingStyles?: { h4?: string; h3?: string },
): string {
  const h4Class = headingStyles?.h4 ?? "font-semibold mt-3 mb-1";
  const h3Class = headingStyles?.h3 ?? "font-bold mt-4 mb-1 text-sm";

  return escapeHtml(text)
    .replaceAll(/^####[ \t]+(\S[^\n]*)$/gm, `<p class="${h4Class}">$1</p>`)
    .replaceAll(/^###[ \t]+(\S[^\n]*)$/gm, `<p class="${h3Class}">$1</p>`)
    .replaceAll("---", "")
    .replaceAll(/^\d+\.[ \t]+/gm, (m) => `<br/>${m}`)
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll("\n\n", "<br/><br/>")
    .replaceAll("\n", "<br/>")
    .replaceAll("- **", "&bull; <strong>")
    .replaceAll(/^- /gm, "&bull; ");
}
