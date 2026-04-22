import type { APIRoute } from "astro";
import { getAllTags } from "../../lib/content";
import { tagIndexToMd } from "../../lib/md-output";
import { getSiteUrl } from "../../lib/site-config";

export const GET: APIRoute = () => {
  const siteUrl = getSiteUrl();
  const tags = [...getAllTags().entries()];

  return new Response(tagIndexToMd(tags, siteUrl), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
