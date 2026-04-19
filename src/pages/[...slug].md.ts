import type { APIRoute } from "astro";
import { getEntryAndFolderParams, type EntryOrFolderProps } from "../lib/routes";
import { postToMd, folderToMd } from "../lib/md-output";
import { getSiteUrl } from "../lib/site-config";

export function getStaticPaths() {
  return getEntryAndFolderParams();
}

export const GET: APIRoute = ({ props }) => {
  const p = props as EntryOrFolderProps;
  const siteUrl = getSiteUrl();
  const content = p.kind === "post" ? postToMd(p.entry, siteUrl) : folderToMd(p.folder, siteUrl);

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
