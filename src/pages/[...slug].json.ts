import type { APIRoute, GetStaticPathsResult } from "astro";
import {
  loadAllEntries,
  loadAllFolders,
  type Entry,
  type FolderEntry,
} from "../lib/content";
import { postToJson, folderToJson } from "../lib/json-output";

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

export const GET: APIRoute = ({ props }) => {
  const { kind } = props as { kind: string };
  const data =
    kind === "post"
      ? postToJson((props as { entry: Entry }).entry)
      : folderToJson((props as { folder: FolderEntry }).folder);

  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
