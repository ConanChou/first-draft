import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import sitemap from "@astrojs/sitemap";
import { getContentType, getPublicOverridePath } from "./src/lib/public-override.js";

function publicOverridePlugin() {
  return {
    name: "public-override",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const overridePath = getPublicOverridePath(req.url ?? "");
        if (!overridePath) return next();

        res.setHeader("Content-Type", getContentType(overridePath));
        res.end(readFileSync(overridePath));
      });
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL ?? "https://example.com",
  integrations: [sitemap()],
  vite: {
    plugins: [publicOverridePlugin()],
  },
});
