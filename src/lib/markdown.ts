/**
 * Markdown rendering utilities.
 * Uses Astro's built-in markdown processor at runtime.
 * For now: thin wrappers, expand as needed.
 */

/** Rewrite inline #tag tokens to HTML links (outside code/pre) */
export function rewriteHashtagsHtml(html: string): string {
  // Only rewrite tags outside <code> and <pre> blocks
  // After `>` covers #tag at the start of a paragraph (marked emits <p>#tag…)
  const HASHTAG = /(?<=[\s>]|^)#([A-Za-z\u4e00-\u9fff\u3040-\u30ff][A-Za-z0-9_\-\u4e00-\u9fff\u3040-\u30ff]*)/g;
  // Simple approach: split on code blocks (already HTML-escaped at this point),
  // rewrite only in text segments
  return splitOnCode(html, (text) =>
    text.replace(
      HASHTAG,
      (_, tag) => `<a href="/tags/${tag}/">#${tag}</a>`
    )
  );
}

/** Rewrite inline #tag tokens to .md links for the .md endpoint */
export function rewriteHashtagsMd(md: string): string {
  const HASHTAG = /(?<=\s|^)#([A-Za-z\u4e00-\u9fff\u3040-\u30ff][A-Za-z0-9_\-\u4e00-\u9fff\u3040-\u30ff]*)/g;
  return splitOnCodeMd(md, (text) =>
    text.replace(HASHTAG, (_, tag) => `[#${tag}](/tags/${tag}.md)`)
  );
}

/**
 * Prepend a Δ NNNN sigil to any anchor pointing to an internal post path
 * (/NNNN, /NNNN-slug, /NNNN.html, /NNNN/, /NNNN#hash). Idempotent.
 */
export function rewriteDeltaMentions(html: string): string {
  const THIN = "\u2009"; // thin space between Δ and digits
  const NBSP = "\u00A0"; // non-breaking space between sigil and title
  const DELTA_OPEN = `<span class="delta">`;
  // href may appear anywhere in the attribute list, not necessarily first.
  const ANCHOR_RE =
    /<a\b([^>]*?)href="(\/(\d{4})(?:[-./#][^"]*)?)"([^>]*?)>([\s\S]*?)<\/a>/g;
  return html.replace(ANCHOR_RE, (whole, pre, href, id, post, inner) => {
    if (inner.startsWith(DELTA_OPEN)) return whole; // already rewritten
    const sigil = `${DELTA_OPEN}Δ${THIN}${id}</span>`;
    const body = inner === id ? sigil : `${sigil}${NBSP}${inner}`;
    return `<a${pre}href="${href}"${post}>${body}</a>`;
  });
}

/** Rewrite internal HTML links to .md siblings */
export function rewriteInternalLinksMd(md: string): string {
  // e.g. [text](/0042-some-post/) → [text](/0042-some-post.md)
  return md.replace(
    /\[([^\]]+)\]\((\/[^)#?]+?)\/?(\)|#|\?)/g,
    (_, text, path, end) => `[${text}](${path}.md${end}`
  );
}

// ── Helpers ───────────────────────────────────────────────────────

/** Apply transform to HTML text nodes outside <code>/<pre> tags */
function splitOnCode(html: string, transform: (s: string) => string): string {
  return html.replace(
    /(<(pre|code)[^>]*>[\s\S]*?<\/\2>)|([^<]+)/g,
    (match, code) => (code ? match : transform(match))
  );
}

/** Apply transform to markdown text outside code blocks/spans */
function splitOnCodeMd(md: string, transform: (s: string) => string): string {
  const parts: string[] = [];
  let last = 0;
  // Match fenced code blocks and inline code
  const CODE_RE = /```[\s\S]*?```|`[^`]*`/g;
  let m: RegExpExecArray | null;
  while ((m = CODE_RE.exec(md)) !== null) {
    parts.push(transform(md.slice(last, m.index)));
    parts.push(m[0]!);
    last = m.index + m[0]!.length;
  }
  parts.push(transform(md.slice(last)));
  return parts.join("");
}
