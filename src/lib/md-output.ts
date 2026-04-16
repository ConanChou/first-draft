/**
 * Generates the .md sibling output per spec §5.3.
 * Used by the /[...slug].md.ts and /index.md.ts endpoints.
 */

import type { Entry, FolderEntry } from "./content.js";
import { rewriteHashtagsMd, rewriteInternalLinksMd } from "./markdown.js";

function stripLeadingH1(body: string): string {
  return body.replace(/^\s*#[^#][^\n]*(\n|$)/, "");
}

export type HomeListItem =
  | { kind: "entry"; item: Entry }
  | { kind: "folder"; item: FolderEntry };

/** Render a post as a clean .md consumption artifact. */
export function postToMd(entry: Entry, siteUrl: string): string {
  const date = entry.date.slice(0, 10);
  const metaParts: string[] = [date, entry.lang];
  if (entry.tags.length > 0) {
    metaParts.push(entry.tags.map((t) => `[#${t}](/tags/${t}.md)`).join(" · "));
  }
  const metaLine = `*${metaParts.join(" · ")}*`;

  const rawBody = stripLeadingH1(entry.body);
  // Internal links first — rewriteHashtagsMd produces /tags/x.md links that must not be re-rewritten
  const body = rewriteHashtagsMd(rewriteInternalLinksMd(rawBody));

  return [
    `# ${entry.title}`,
    "",
    metaLine,
    "",
    body.trim(),
    "",
    "---",
    `*[← Index](/index.md) · Source: ${siteUrl}/${entry.slug}/*`,
  ].join("\n");
}

/** Render a folder as a clean .md consumption artifact. */
export function folderToMd(folder: FolderEntry, siteUrl: string): string {
  const date = folder.date.slice(0, 10);
  const lines: string[] = [`# ${folder.title}`, "", `*${date}*`];

  if (folder.intro) {
    lines.push("", folder.intro.trim());
  }

  lines.push("", "## Entries", "");

  const children = [...folder.children].sort(
    (a, b) =>
      new Date((b as Entry).date).getTime() -
      new Date((a as Entry).date).getTime()
  );

  for (const child of children) {
    const e = child as Entry;
    const entryDate = e.date.slice(0, 10);
    lines.push(`- [${e.id} ${e.title}](/${e.slug}.md) — ${entryDate}`);
  }

  lines.push("", "---", `*[← Index](/index.md) · Source: ${siteUrl}/${folder.slug}/*`);

  return lines.join("\n");
}

/** Render the home listing as a clean .md consumption artifact. */
export function homeToMd(items: HomeListItem[], siteUrl: string): string {
  const lines: string[] = ["# conan.one", "", "## Entries", ""];

  for (const { kind, item } of items) {
    const date = item.date.slice(0, 10);
    if (kind === "entry") {
      const e = item as Entry;
      lines.push(`- [${e.id} ${e.title}](/${e.slug}.md) — ${date}`);
    } else {
      const f = item as FolderEntry;
      lines.push(`- [${f.title}](/${f.slug}.md) — ${date}`);
    }
  }

  lines.push("", "---", `*Source: ${siteUrl}/*`);

  return lines.join("\n");
}
