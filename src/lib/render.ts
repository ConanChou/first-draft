/** Markdown → HTML renderer (marked + smart typography + HTML rewrites). */

import { marked } from "marked";
import {
  rewriteDeltaMentions,
  rewriteHashtagsHtml,
} from "./markdown.js";
import { applySmartTypography } from "./typography.js";
import { stripLeadingH1 } from "./utils.js";
import { processFootnotes, buildFootnoteSection } from "./footnotes.js";

marked.setOptions({ gfm: true, breaks: false });
marked.use({
  renderer: {
    hr(): string {
      return `<hr class="hr-dots" />`;
    },
    link({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const isExternal = /^https?:\/\//.test(href);
      const titleAttr = title ? ` title="${escAttr(title)}"` : "";
      const targetAttr = isExternal ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
    },
  },
});

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Same HTML rewrite pipeline applied to both body and footnote content. */
function rewriteHtml(html: string, lang: string): string {
  return rewriteHashtagsHtml(rewriteDeltaMentions(applySmartTypography(html, lang)));
}

export async function renderMd(
  body: string,
  lang: string = "en",
): Promise<string> {
  const { md: processedMd, footnotes } = processFootnotes(stripLeadingH1(body));
  const raw = await marked.parse(processedMd);
  const bodyHtml = rewriteHtml(raw, lang);
  if (footnotes.length === 0) return bodyHtml;
  const renderedFootnotes = footnotes.map((fn) => ({
    ...fn,
    content: rewriteHtml(marked.parseInline(fn.content) as string, lang),
  }));
  return bodyHtml + buildFootnoteSection(renderedFootnotes);
}

export function containsModelViewer(html: string): boolean {
  return /<model-viewer(?:\s|>)/i.test(html);
}
