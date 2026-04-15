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

/** Strip a leading h1 (# …) from the body so it isn't duplicated below the post title. */
function stripLeadingH1(body: string): string {
  return body.replace(/^\s*#[^#][^\n]*(\n|$)/, "");
}

/** Render markdown body to HTML, with #tag rewriting */
export async function renderMd(body: string): Promise<string> {
  const raw = await marked.parse(stripLeadingH1(body));
  return rewriteHashtagsHtml(raw);
}
