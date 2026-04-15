import type { APIRoute } from "astro";
import { loadAllEntries } from "../lib/content";

export const GET: APIRoute = () => {
  const siteUrl = process.env.SITE_URL ?? "https://conan.one";
  const entries = loadAllEntries()
    .filter((e) => e.lang === "en")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const items = entries
    .map(
      (e) => `
    <item>
      <title><![CDATA[${e.title}]]></title>
      <link>${siteUrl}/${e.slug}/</link>
      <guid>${siteUrl}/${e.slug}/</guid>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <description><![CDATA[${e.title}]]></description>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>conan.one (en)</title>
    <link>${siteUrl}</link>
    <description>conan.one — en</description>
    <language>en</language>
    <atom:link href="${siteUrl}/feed.en.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
