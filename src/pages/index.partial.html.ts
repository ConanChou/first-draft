import type { APIRoute } from "astro";
import {
  loadAllEntries,
  loadAllFolders,
  type Entry,
  type FolderEntry,
} from "../lib/content";

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

export const GET: APIRoute = () => {
  const entries = loadAllEntries().filter((e) => e.folder === "");
  const folders = loadAllFolders();

  type Item =
    | { kind: "entry"; item: Entry }
    | { kind: "folder"; item: FolderEntry };

  const items: Item[] = [
    ...entries.map((e) => ({ kind: "entry" as const, item: e })),
    ...folders.map((f) => ({ kind: "folder" as const, item: f })),
  ].sort(
    (a, b) => new Date(b.item.date).getTime() - new Date(a.item.date).getTime()
  );

  const listItems = items
    .map(({ kind, item }) => {
      if (kind === "entry") {
        const e = item as Entry;
        return `<li data-lang="${escHtml(e.lang)}"><span class="entry-num">${escHtml(e.id)}</span><a href="/${escHtml(e.slug)}/" class="entry-title">${escHtml(e.title || `(untitled ${e.id})`)}</a><span class="entry-dots" aria-hidden="true"></span><span class="entry-date">${fmtDate(e.date)}</span></li>`;
      } else {
        const f = item as FolderEntry;
        return `<li data-lang="${escHtml(f.lang)}"><span class="entry-num">▓▓▓▓</span><a href="/${escHtml(f.slug)}/" class="entry-title">${escHtml(f.title)}</a><span class="entry-dots" aria-hidden="true"></span><span class="entry-date">${fmtDate(f.date)}</span></li>`;
      }
    })
    .join("\n");

  return new Response(`<ul class="entry-list">\n${listItems}\n</ul>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
