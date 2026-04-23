/** Footnote extraction and HTML generation for Markdown. */

export interface FootnoteEntry {
  label: string;
  index: number;
  content: string;
}

const PLACEHOLDER = "\u0000FN_CODE_";

/** Mask fenced and inline code so footnote regexes don't fire inside them. */
function maskCode(md: string): { masked: string; chunks: string[] } {
  const chunks: string[] = [];
  const masked = md
    .replace(/```[\s\S]*?```/g, (m) => {
      const i = chunks.push(m) - 1;
      return `${PLACEHOLDER}${i}\u0000`;
    })
    .replace(/`[^`\n]*`/g, (m) => {
      const i = chunks.push(m) - 1;
      return `${PLACEHOLDER}${i}\u0000`;
    });
  return { masked, chunks };
}

function unmaskCode(md: string, chunks: string[]): string {
  return md.replace(/\u0000FN_CODE_(\d+)\u0000/g, (_, i) => chunks[+i] ?? "");
}

/**
 * Extracts footnote definitions and inline references from markdown.
 * Returns cleaned markdown (definitions removed, refs replaced with HTML)
 * and an ordered list of footnote entries. Code spans/blocks are preserved.
 */
export function processFootnotes(md: string): {
  md: string;
  footnotes: FootnoteEntry[];
} {
  const { masked, chunks } = maskCode(md);
  const defs = new Map<string, string>();

  // Multi-line: definition runs until a blank line or another top-level construct.
  // Continuation lines must be indented (≥2 spaces or a tab).
  const defRegex = /^\[\^([^\]]+)\]:[ \t]*(.*(?:\n(?:[ \t]{2,}|\t).*)*)/gm;
  let cleaned = masked.replace(defRegex, (_match, label: string, content: string) => {
    const dedented = content
      .split("\n")
      .map((line, i) => (i === 0 ? line : line.replace(/^(?:[ \t]{1,4}|\t)/, "")))
      .join("\n")
      .trim();
    defs.set(label, dedented);
    return "";
  });

  // Collect labels in order of first inline appearance (refs only, not defs)
  const refOrder: string[] = [];
  const refRegex = /\[\^([^\]]+)\]/g;
  for (const m of cleaned.matchAll(refRegex)) {
    const label = m[1];
    if (!refOrder.includes(label)) refOrder.push(label);
  }

  if (refOrder.length === 0) {
    const restored = unmaskCode(cleaned.replace(/\n{3,}/g, "\n\n").trim(), chunks);
    return { md: restored, footnotes: [] };
  }

  cleaned = cleaned.replace(refRegex, (_: string, label: string) => {
    const n = refOrder.indexOf(label) + 1;
    return `\u2060<sup class="fn-ref" id="fnref-${n}"><a href="#fn-${n}">${n}</a></sup>`;
  });

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  const footnotes: FootnoteEntry[] = refOrder.map((label, i) => ({
    label,
    index: i + 1,
    content: defs.get(label) ?? "",
  }));

  return { md: unmaskCode(cleaned, chunks), footnotes };
}

/** Builds the footnotes section HTML from an ordered list of footnote entries. */
export function buildFootnoteSection(footnotes: FootnoteEntry[]): string {
  if (footnotes.length === 0) return "";

  const items = footnotes
    .map(
      ({ index, content }) =>
        `<li id="fn-${index}" class="footnote-item">` +
        `<span class="footnote-content">${content}</span> ` +
        `<a href="#fnref-${index}" class="fn-back" aria-label="Return to reference ${index}">↩</a>` +
        `</li>`,
    )
    .join("\n");

  return (
    `\n<section class="footnotes" aria-label="Footnotes">\n` +
    `<ol class="footnotes-list">\n` +
    items +
    `\n</ol>\n</section>`
  );
}
