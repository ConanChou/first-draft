/**
 * Shared getStaticPaths for [...slug].astro
 * Renders markdown and provides all the data needed by the post template.
 */

import { loadAllEntries, loadAllFolders, type Entry, type FolderEntry } from "./content.js";
import { renderMd } from "./render.js";

export interface RouteEntry extends Entry {
  renderedHtml: string;
  siteUrl: string;
}

export interface FolderRouteEntry extends FolderEntry {
  introHtml?: string;
  siteUrl: string;
}

export async function getStaticPaths() {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries();
  const folders = loadAllFolders();

  const postParams = await Promise.all(
    entries.map(async (entry) => {
      const renderedHtml = await renderMd(entry.body);
      return {
        params: { slug: entry.slug },
        props: { kind: "post" as const, entry: { ...entry, renderedHtml, siteUrl } as RouteEntry, siteUrl },
      };
    })
  );

  const folderParams = await Promise.all(
    folders.map(async (folder) => {
      const introHtml = folder.intro ? await renderMd(folder.intro) : undefined;
      return {
        params: { slug: folder.slug },
        props: { kind: "folder" as const, folder: { ...folder, introHtml, siteUrl } as FolderRouteEntry, siteUrl },
      };
    })
  );

  return [...postParams, ...folderParams];
}
