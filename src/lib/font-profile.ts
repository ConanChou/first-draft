export type FontProfile = "latin" | "mixed";

export function getFontProfileForLang(lang: string): FontProfile {
  return lang === "en" ? "latin" : "mixed";
}

export function getFontProfileForLangs(langs: Iterable<string>): FontProfile {
  let sawAny = false;

  for (const lang of langs) {
    sawAny = true;
    if (getFontProfileForLang(lang) === "mixed") return "mixed";
  }

  return sawAny ? "latin" : "mixed";
}
