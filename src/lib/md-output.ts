/**
 * Generates the .md sibling output per spec §5.3.
 * Used by /[...slug].md.ts and /index.md.ts.
 */

import type { Entry, FolderEntry } from "./content.js";
import { rewriteHashtagsMd, rewriteInternalLinksMd } from "./markdown.js";
import { getSiteName } from "./site-config.js";
import { fmtDate, stripLeadingH1 } from "./utils.js";

/** Render a post as a clean .md consumption artifact. */
export function postToMd(entry: Entry, siteUrl: string): string {
  const metaParts: string[] = [fmtDate(entry.date), entry.lang];
  if (entry.tags.length > 0) {
    metaParts.push(entry.tags.map((t) => `[#${t}](/tags/${t}.md)`).join(" · "));
  }
  const body = rewriteHashtagsMd(rewriteInternalLinksMd(stripLeadingH1(entry.body)));

  return [
    `# ${entry.title}`,
    "",
    `*${metaParts.join(" · ")}*`,
    "",
    body.trim(),
    "",
    "---",
    `*[← Index](/index.md) · Source: ${siteUrl}/${entry.slug}/*`,
  ].join("\n");
}

/** Render a folder as a clean .md consumption artifact. */
export function folderToMd(folder: FolderEntry, siteUrl: string): string {
  const lines: string[] = [`# ${folder.title}`, "", `*${fmtDate(folder.date)}*`];
  if (folder.intro) lines.push("", folder.intro.trim());
  lines.push("", "## Entries", "");

  const children = [...folder.children].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (const e of children) {
    lines.push(`- [${e.id} ${e.title}](/${e.slug}.md) — ${fmtDate(e.date)}`);
  }

  lines.push("", "---", `*[← Index](/index.md) · Source: ${siteUrl}/${folder.slug}/*`);
  return lines.join("\n");
}

function isFolder(item: Entry | FolderEntry): item is FolderEntry {
  return "children" in item;
}

/** Render the home listing as a clean .md consumption artifact. */
export function homeToMd(items: (Entry | FolderEntry)[], siteUrl: string): string {
  const lines: string[] = [`# ${getSiteName({ SITE_URL: siteUrl })}`, "", "## Entries", ""];

  for (const item of items) {
    const date = fmtDate(item.date);
    if (isFolder(item)) {
      lines.push(`- [${item.title}](/${item.slug}.md) — ${date}`);
    } else {
      lines.push(`- [${item.id} ${item.title}](/${item.slug}.md) — ${date}`);
    }
  }

  lines.push("", "---", `*Source: ${siteUrl}/*`);
  return lines.join("\n");
}

export function tagToMd(tag: string, entries: Entry[], siteUrl: string): string {
  const lines: string[] = [`# #${tag}`, ""];
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const entry of sorted) {
    lines.push(`- [${entry.id} ${entry.title}](/${entry.slug}.md) — ${fmtDate(entry.date)}`);
  }

  lines.push("", "---", `*[← Tags](/tags/index.md) · Source: ${siteUrl}/tags/${tag}/*`);
  return lines.join("\n");
}

export function tagIndexToMd(tags: Array<[string, Entry[]]>, siteUrl: string): string {
  const lines: string[] = ["# Tags", ""];
  const sorted = [...tags].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  for (const [tag, entries] of sorted) {
    lines.push(`- [#${tag}](/tags/${tag}.md) — ${entries.length}`);
  }

  lines.push("", "---", `*Source: ${siteUrl}/tags/*`);
  return lines.join("\n");
}
