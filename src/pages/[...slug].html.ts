import type { APIRoute } from "astro";
import { getEntryAndFolderParams, type EntryOrFolderProps } from "../lib/routes";
import { escHtml } from "../lib/utils";

export function getStaticPaths() {
  return getEntryAndFolderParams();
}

export const GET: APIRoute = ({ props }) => {
  const p = props as EntryOrFolderProps;
  const slug = p.kind === "post" ? p.entry.slug : p.folder.slug;
  const url = `/${escHtml(slug)}/`;
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
<title>Redirecting…</title>
</head>
<body><a href="${url}">Continue</a></body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
