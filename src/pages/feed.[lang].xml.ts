import type { APIRoute, GetStaticPathsResult } from "astro";
import { loadAllEntries, type Entry } from "../lib/content";
import { getSiteDescription, getSiteName, getSiteUrl } from "../lib/site-config";

const FEED_LANGS = ["zh", "en"] as const;
type FeedLang = (typeof FEED_LANGS)[number];

export function getStaticPaths(): GetStaticPathsResult {
  return FEED_LANGS.map((lang) => ({
    params: { lang },
    props: { lang },
  }));
}

function renderItem(e: Entry, siteUrl: string): string {
  return `
    <item>
      <title><![CDATA[${e.title}]]></title>
      <link>${siteUrl}/${e.slug}/</link>
      <guid>${siteUrl}/${e.slug}/</guid>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <description><![CDATA[${e.title}]]></description>
    </item>`;
}

export const GET: APIRoute = ({ props }) => {
  const lang = props.lang as FeedLang;
  const siteUrl = getSiteUrl();
  const siteName = getSiteName();
  const siteDescription = getSiteDescription();
  const entries = loadAllEntries()
    .filter((e) => e.lang === lang)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const channelTitle = lang === "zh" ? siteName : `${siteName} (${lang})`;
  const items = entries.map((e) => renderItem(e, siteUrl)).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${channelTitle}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription} (${lang})</description>
    <language>${lang}</language>
    <atom:link href="${siteUrl}/feed.${lang}.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
