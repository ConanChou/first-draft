/**
 * Shared getStaticPaths for [...slug].astro
 * Renders markdown and provides all the data needed by the post template.
 */

import { loadAllEntries, type Entry } from "./content.js";
import { renderMd } from "./render.js";

export interface RouteEntry extends Entry {
  renderedHtml: string;
  siteUrl: string;
}

export async function getStaticPaths() {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries();
  const params = await Promise.all(
    entries.map(async (entry) => {
      const renderedHtml = await renderMd(entry.body);
      return {
        params: { slug: entry.slug },
        props: { entry: { ...entry, renderedHtml } as RouteEntry, siteUrl },
      };
    })
  );
  return params;
}
