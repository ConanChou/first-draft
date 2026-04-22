type SiteEnv = {
  DEFAULT_LANG?: string;
  SITE_DESCRIPTION?: string;
  SITE_NAME?: string;
  SITE_OWNER?: string;
  SITE_URL?: string;
};

export const DEFAULT_LANG = "zh";
export const DEFAULT_SITE_DESCRIPTION = "A calm, text-first publishing system.";
export const DEFAULT_SITE_URL = "https://example.com";
export const DEFAULT_SITE_NAME = "example.com";
export const DEFAULT_SITE_OWNER = "Site Owner";

function getEnv(env?: SiteEnv): SiteEnv {
  return env ?? ((import.meta as { env?: SiteEnv }).env ?? {});
}

export function getDefaultLang(env?: SiteEnv): string {
  return getEnv(env).DEFAULT_LANG?.trim() || DEFAULT_LANG;
}

export function getSiteDescription(env?: SiteEnv): string {
  return getEnv(env).SITE_DESCRIPTION?.trim() || DEFAULT_SITE_DESCRIPTION;
}

export function getSiteUrl(env?: SiteEnv): string {
  return getEnv(env).SITE_URL?.trim() || DEFAULT_SITE_URL;
}

export function getSiteName(env?: SiteEnv): string {
  const configuredName = getEnv(env).SITE_NAME?.trim();
  if (configuredName) return configuredName;

  const siteUrl = getSiteUrl(env);
  try {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
    return hostname || DEFAULT_SITE_NAME;
  } catch {
    const hostname = siteUrl
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "")
      .trim();
    return hostname || DEFAULT_SITE_NAME;
  }
}

export function getSiteOwner(env?: SiteEnv): string {
  return getEnv(env).SITE_OWNER?.trim() || getSiteName(env) || DEFAULT_SITE_OWNER;
}
