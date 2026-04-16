/** Markdown → HTML renderer (marked + hashtag rewriting). */

import { marked } from "marked";
import { rewriteHashtagsHtml } from "./markdown.js";
import { stripLeadingH1 } from "./utils.js";

marked.setOptions({ gfm: true, breaks: false });

export async function renderMd(body: string): Promise<string> {
  const raw = await marked.parse(stripLeadingH1(body));
  return rewriteHashtagsHtml(raw);
}
