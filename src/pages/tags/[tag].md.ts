import type { APIRoute } from "astro";
import { getAllTags } from "../../lib/content";
import { tagToMd } from "../../lib/md-output";
import { getSiteUrl } from "../../lib/site-config";

export function getStaticPaths() {
  const tags = getAllTags();
  return [...tags.keys()].map((tag) => ({
    params: { tag },
    props: { tag },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const tag = props.tag as string;
  const entries = getAllTags().get(tag) ?? [];
  const siteUrl = getSiteUrl();

  return new Response(tagToMd(tag, entries, siteUrl), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
