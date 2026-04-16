import type { APIRoute } from "astro";
import { getEntryAndFolderParams, type EntryOrFolderProps } from "../lib/routes";
import { postToJson, folderToJson } from "../lib/json-output";

export function getStaticPaths() {
  return getEntryAndFolderParams();
}

export const GET: APIRoute = ({ props }) => {
  const p = props as EntryOrFolderProps;
  const data = p.kind === "post" ? postToJson(p.entry) : folderToJson(p.folder);

  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
