import type { APIRoute, GetStaticPathsResult } from "astro";
import {
  loadAllEntries,
  loadAllFolders,
  type Entry,
  type FolderEntry,
} from "../lib/content";
import { renderMd } from "../lib/render";

export function getStaticPaths(): GetStaticPathsResult {
  const entries = loadAllEntries();
  const folders = loadAllFolders();

  return [
    ...entries.map((entry) => ({
      params: { slug: entry.slug },
      props: { kind: "post" as const, entry },
    })),
    ...folders.map((folder) => ({
      params: { slug: folder.slug },
      props: { kind: "folder" as const, folder },
    })),
  ];
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const GET: APIRoute = async ({ props }) => {
  const { kind } = props as { kind: string };
  let html: string;

  if (kind === "post") {
    const { entry } = props as { entry: Entry };
    const bodyHtml = await renderMd(entry.body);
    const tagsHtml =
      entry.tags.length > 0
        ? `<div class="post-tags">${entry.tags.map((t) => `<a href="/tags/${escHtml(t)}/">#${escHtml(t)}</a>`).join("")}</div>`
        : "";
    html = `<article class="note" data-id="${escHtml(entry.id)}">
<header class="post-header">
<h1 class="post-title">${escHtml(entry.title)}</h1>
<p class="post-meta"><time datetime="${escHtml(entry.date)}">${fmtDate(entry.date)}</time></p>
</header>
<div class="post-body">${bodyHtml}</div>
${tagsHtml}
</article>`;
  } else {
    const { folder } = props as { folder: FolderEntry };
    const introHtml = folder.intro ? await renderMd(folder.intro) : "";
    const childrenSorted = [...folder.children].sort(
      (a, b) =>
        new Date((b as Entry).date).getTime() -
        new Date((a as Entry).date).getTime()
    );
    const listItems = childrenSorted
      .map((child) => {
        const e = child as Entry;
        return `<li data-lang="${escHtml(e.lang)}"><span class="entry-num">${escHtml(e.id)}</span><a href="/${escHtml(e.slug)}/" class="entry-title">${escHtml(e.title || `(untitled ${e.id})`)}</a><span class="entry-dots" aria-hidden="true"></span><span class="entry-date">${fmtDate(e.date)}</span></li>`;
      })
      .join("\n");
    html = `<div class="section-page">
<header class="post-header"><h1 class="post-title">${escHtml(folder.title)}</h1></header>
${introHtml ? `<div class="post-body section-intro">${introHtml}</div>` : ""}
<ul class="entry-list">
${listItems}
</ul>
</div>`;
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
