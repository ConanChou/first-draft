import type { APIRoute } from "astro";
import {
  loadAllEntries,
  loadAllFolders,
  type Entry,
  type FolderEntry,
} from "../lib/content";
import { homeToMd, type HomeListItem } from "../lib/md-output";

export const GET: APIRoute = () => {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries().filter((e) => e.folder === "");
  const folders = loadAllFolders();

  const items: HomeListItem[] = [
    ...entries.map((e) => ({ kind: "entry" as const, item: e as Entry })),
    ...folders.map((f) => ({ kind: "folder" as const, item: f as FolderEntry })),
  ].sort(
    (a, b) => new Date(b.item.date).getTime() - new Date(a.item.date).getTime()
  );

  return new Response(homeToMd(items, siteUrl), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
