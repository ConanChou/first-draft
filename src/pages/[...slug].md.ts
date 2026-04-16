import type { APIRoute, GetStaticPathsResult } from "astro";
import {
  loadAllEntries,
  loadAllFolders,
  type Entry,
  type FolderEntry,
} from "../lib/content";
import { postToMd, folderToMd } from "../lib/md-output";

export function getStaticPaths(): GetStaticPathsResult {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries();
  const folders = loadAllFolders();

  return [
    ...entries.map((entry) => ({
      params: { slug: entry.slug },
      props: { kind: "post" as const, entry, siteUrl },
    })),
    ...folders.map((folder) => ({
      params: { slug: folder.slug },
      props: { kind: "folder" as const, folder, siteUrl },
    })),
  ];
}

export const GET: APIRoute = ({ props }) => {
  const { kind, siteUrl } = props as { kind: string; siteUrl: string };
  let content: string;

  if (kind === "post") {
    content = postToMd((props as { entry: Entry }).entry, siteUrl);
  } else {
    content = folderToMd((props as { folder: FolderEntry }).folder, siteUrl);
  }

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
