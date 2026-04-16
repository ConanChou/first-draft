import type { APIRoute } from "astro";
import { loadAllEntries, loadAllFolders, type Entry, type FolderEntry } from "../lib/content";
import { entryLiHtml, folderLiHtml } from "../lib/entry-html";

function isFolder(item: Entry | FolderEntry): item is FolderEntry {
  return "children" in item;
}

export const GET: APIRoute = () => {
  const entries = loadAllEntries().filter((e) => e.folder === "");
  const folders = loadAllFolders();

  const items: (Entry | FolderEntry)[] = [...entries, ...folders].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const listItems = items.map((it) => (isFolder(it) ? folderLiHtml(it) : entryLiHtml(it))).join("\n");

  return new Response(`<ul class="entry-list">\n${listItems}\n</ul>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
