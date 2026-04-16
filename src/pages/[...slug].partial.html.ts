import type { APIRoute } from "astro";
import { getEntryAndFolderParams, type EntryOrFolderProps } from "../lib/routes";
import { renderMd } from "../lib/render";
import { entryLiHtml } from "../lib/entry-html";
import { escHtml, fmtDate } from "../lib/utils";

export function getStaticPaths() {
  return getEntryAndFolderParams();
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as EntryOrFolderProps;
  let html: string;

  if (p.kind === "post") {
    const { entry } = p;
    const bodyHtml = await renderMd(entry.body);
    const tagsHtml = entry.tags.length > 0
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
    const { folder } = p;
    const introHtml = folder.intro ? await renderMd(folder.intro) : "";
    const children = [...folder.children].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const listItems = children.map(entryLiHtml).join("\n");
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
