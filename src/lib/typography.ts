/**
 * Smart-typography pass over rendered HTML.
 *
 * Runs on HTML text nodes only — skips <pre>/<code> blocks and tag/attribute
 * contents entirely. Language-specific: en curls ASCII quotes, zh leaves them
 * alone but doubles dashes and ellipses.
 */

export function applySmartTypography(html: string, lang: string): string {
  return walkText(html, (text) =>
    lang === "zh" ? transformZh(text) : transformEn(text),
  );
}

// ── Transforms ────────────────────────────────────────────────────

function transformEn(text: string): string {
  let out = text;
  // Marked HTML-encodes quotes in text nodes; decode so we can curl.
  out = out.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  out = out.replace(/\.\.\./g, "\u2026");
  out = out.replace(/--/g, "\u2014");
  out = out.replace(/\(c\)/gi, "\u00A9");
  out = out.replace(/\(r\)/gi, "\u00AE");
  out = out.replace(/\(tm\)/gi, "\u2122");
  out = curlQuotesEn(out);
  return out;
}

function transformZh(text: string): string {
  let out = text;
  out = out.replace(/\.\.\./g, "\u2026\u2026");
  out = out.replace(/--/g, "\u2014\u2014");
  return out;
}

function curlQuotesEn(text: string): string {
  let out = text;
  // Apostrophe: letter-'-letter (it's, don't)
  out = out.replace(/([A-Za-z0-9])'([A-Za-z])/g, "$1\u2019$2");
  // Year apostrophe: '90s, '04 — treat as closing/apostrophe, not opening.
  out = out.replace(/(^|[\s(\[{])'(\d)/g, "$1\u2019$2");
  // Opening single: at start or after space/open-bracket, before a letter
  out = out.replace(/(^|[\s(\[{])'(?=[A-Za-z])/g, "$1\u2018");
  // Closing single: any remaining ASCII single quote
  out = out.replace(/'/g, "\u2019");
  // Opening double: at start or after space/open-bracket
  out = out.replace(/(^|[\s(\[{])"/g, "$1\u201C");
  // Closing double: any remaining ASCII double quote
  out = out.replace(/"/g, "\u201D");
  return out;
}

// ── HTML text-node walker ─────────────────────────────────────────

/**
 * Apply `transform` only to text nodes (runs of characters outside tags).
 * Passes through tag boundaries and leaves <pre>/<code> block contents intact.
 */
function walkText(html: string, transform: (s: string) => string): string {
  const RE =
    /<(pre|code)(?:\s[^>]*)?>[\s\S]*?<\/\1>|<[^>]+>|[^<]+/gi;
  return html.replace(RE, (match) => {
    if (match.startsWith("<")) return match;
    return transform(match);
  });
}
