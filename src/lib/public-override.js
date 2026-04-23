import { existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".glb", "model/gltf-binary"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

export function getPublicOverrideDir(env = process.env) {
  const dir = env.PUBLIC_OVERRIDE_DIR?.trim();
  return dir || "public-override";
}

export function getPublicOverridePath(requestPath, env = process.env, cwd = process.cwd()) {
  const pathname = decodeURIComponent(requestPath.split("?")[0].split("#")[0] || "/");
  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  if (!relativePath || relativePath === "." || relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    return null;
  }

  const candidate = join(cwd, getPublicOverrideDir(env), relativePath);
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
}

export function getContentType(filePath) {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return MIME_TYPES.get(filePath.slice(dot).toLowerCase()) ?? "application/octet-stream";
}
