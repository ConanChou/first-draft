import type { APIRoute } from "astro";
import { loadAllEntries, loadAllFolders, type Entry, type FolderEntry } from "../lib/content";
import { homeToMd } from "../lib/md-output";

export const GET: APIRoute = () => {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries().filter((e) => e.folder === "");
  const folders = loadAllFolders();

  const items: (Entry | FolderEntry)[] = [...entries, ...folders].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return new Response(homeToMd(items, siteUrl), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
