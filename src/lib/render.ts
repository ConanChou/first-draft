/**
 * Markdown → HTML renderer.
 * Uses the `marked` library for lightweight, fast rendering.
 */

import { marked } from "marked";
import { rewriteHashtagsHtml } from "./markdown.js";

marked.setOptions({
  gfm: true,
  breaks: false,
});

/** Render markdown body to HTML, with #tag rewriting */
export async function renderMd(body: string): Promise<string> {
  const raw = await marked.parse(body);
  return rewriteHashtagsHtml(raw);
}
