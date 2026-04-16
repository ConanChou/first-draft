/**
 * Generates the .json metadata sibling output.
 * Used by the /[...slug].json.ts endpoint.
 */

import type { Entry, FolderEntry } from "./content.js";

export interface PostJson {
  id: string;
  title: string;
  date: string;
  lang: string;
  tags: string[];
  slug: string;
}

export interface FolderJson {
  title: string;
  date: string;
  lang: string;
  tags: string[];
  slug: string;
}

export function postToJson(entry: Entry): PostJson {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    lang: entry.lang,
    tags: entry.tags,
    slug: entry.slug,
  };
}

export function folderToJson(folder: FolderEntry): FolderJson {
  return {
    title: folder.title,
    date: folder.date,
    lang: folder.lang,
    tags: folder.tags,
    slug: folder.slug,
  };
}
