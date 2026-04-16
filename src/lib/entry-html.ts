/**
 * Renders entry-list `<li>` items as HTML strings.
 * Used by the .partial.html endpoints so the markup stays consistent with
 * the Astro EntryItem component.
 */

import type { Entry, FolderEntry } from "./content.js";
import { escHtml, fmtDate } from "./utils.js";

export function entryLiHtml(entry: Entry): string {
  const draftCls = entry.fm.draft ? ' class="draft"' : "";
  const title = entry.title || `(untitled ${entry.id})`;
  const date = entry.fm.draft ? "" : fmtDate(entry.date);
  return (
    `<li data-id="${escHtml(entry.id)}" data-lang="${escHtml(entry.lang)}"${draftCls}>` +
    `<span class="entry-num">${escHtml(entry.id)}</span>` +
    `<a href="/${escHtml(entry.slug)}/" class="entry-title">${escHtml(title)}</a>` +
    `<span class="entry-dots" aria-hidden="true"></span>` +
    `<span class="entry-date">${escHtml(date)}</span>` +
    `</li>`
  );
}

export function folderLiHtml(folder: FolderEntry): string {
  return (
    `<li>` +
    `<span class="entry-num">▓▓▓▓</span>` +
    `<a href="/${escHtml(folder.slug)}/" class="entry-title">${escHtml(folder.title)}</a>` +
    `<span class="entry-dots" aria-hidden="true"></span>` +
    `<span class="entry-date">${escHtml(fmtDate(folder.date))}</span>` +
    `</li>`
  );
}
