/**
 * Shared route params for all `[...slug]` endpoints.
 *
 * `getEntryAndFolderParams()` — raw params, no markdown rendering.
 *   Used by .md, .json, .partial.html endpoints.
 *
 * `getStaticPaths()` — params with pre-rendered HTML attached.
 *   Used by the primary [...slug].astro page.
 */

import { loadAllEntries, loadAllFolders, type Entry, type FolderEntry } from "./content.js";
import { renderMd } from "./render.js";

export interface RouteEntry extends Entry {
  bodyHtml: string;
}

export interface FolderRouteEntry extends FolderEntry {
  introHtml?: string;
}

export type EntryOrFolderProps =
  | { kind: "post"; entry: Entry }
  | { kind: "folder"; folder: FolderEntry };

export function getEntryAndFolderParams() {
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

export async function getStaticPaths() {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries();
  const folders = loadAllFolders();

  const postParams = await Promise.all(
    entries.map(async (entry) => ({
      params: { slug: entry.slug },
      props: {
        kind: "post" as const,
        entry: { ...entry, bodyHtml: await renderMd(entry.body) } as RouteEntry,
        siteUrl,
      },
    })),
  );

  const folderParams = await Promise.all(
    folders.map(async (folder) => ({
      params: { slug: folder.slug },
      props: {
        kind: "folder" as const,
        folder: {
          ...folder,
          introHtml: folder.intro ? await renderMd(folder.intro) : undefined,
        } as FolderRouteEntry,
        siteUrl,
      },
    })),
  );

  return [...postParams, ...folderParams];
}
