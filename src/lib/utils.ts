/** Shared tiny helpers used by pages, endpoints, and renderers. */

export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strip a leading h1 (# …) so it isn't duplicated below the rendered post title. */
export function stripLeadingH1(body: string): string {
  return body.replace(/^\s*# [^\n]*\n?/, "");
}
