import { shouldHandleFootnoteItemClick } from "./footnote-nav";

const SIDENOTE_MIN_WIDTH = 1060;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

function isSidenoteMode(): boolean {
  return window.innerWidth >= SIDENOTE_MIN_WIDTH;
}

function getOffsetFromParent(el: HTMLElement, parent: HTMLElement): number {
  const parentRect = parent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - parentRect.top;
}

function buildSidenotes() {
  const postBody = document.querySelector<HTMLElement>(".post-body");
  if (!postBody) return;

  postBody.querySelectorAll(".sidenote").forEach((sidenote) => sidenote.remove());

  if (!isSidenoteMode()) return;

  const items = document.querySelectorAll<HTMLElement>(".footnote-item");
  if (!items.length) return;

  let previousBottom = -Infinity;

  items.forEach((item) => {
    const idMatch = item.id.match(/^fn-(\d+)$/);
    if (!idMatch) return;

    const noteNumber = idMatch[1];
    const ref = document.querySelector<HTMLElement>(`#fnref-${noteNumber}`);
    if (!ref) return;

    const contentEl = item.querySelector<HTMLElement>(".footnote-content");
    const content = contentEl?.innerHTML ?? "";

    const sidenote = document.createElement("aside");
    sidenote.className = "sidenote";
    sidenote.id = `sn-${noteNumber}`;
    sidenote.setAttribute("aria-label", `Footnote ${noteNumber}`);
    sidenote.innerHTML = `<span class="sidenote-num">${noteNumber}.</span> ${content}`;

    postBody.appendChild(sidenote);

    let top = getOffsetFromParent(ref, postBody);
    if (top < previousBottom + 8) top = previousBottom + 8;

    sidenote.style.top = `${top}px`;
    previousBottom = top + sidenote.getBoundingClientRect().height;

    sidenote.addEventListener("mouseenter", () => {
      sidenote.classList.add("sn-highlight");
      ref.classList.add("sn-active");
    });

    sidenote.addEventListener("mouseleave", () => {
      sidenote.classList.remove("sn-highlight");
      ref.classList.remove("sn-active");
    });

    ref.addEventListener("mouseenter", () => {
      sidenote.classList.add("sn-highlight");
    });

    ref.addEventListener("mouseleave", () => {
      sidenote.classList.remove("sn-highlight");
    });
  });
}

export function initPostFootnotes() {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
    resizeTimer = undefined;
  }

  document.querySelectorAll<HTMLAnchorElement>(".fn-ref a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (isSidenoteMode()) return;

      const href = link.getAttribute("href");
      if (!href) return;

      event.preventDefault();
      document.querySelector<HTMLElement>(href)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  });

  document.querySelectorAll<HTMLElement>(".footnote-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (isSidenoteMode()) return;
      if (!shouldHandleFootnoteItemClick(event.target)) return;

      event.preventDefault();

      const noteNumber = item.id.match(/^fn-(\d+)$/)?.[1];
      if (!noteNumber) return;

      const ref = document.querySelector<HTMLElement>(`#fnref-${noteNumber}`);
      if (!ref) return;

      const top = ref.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  buildSidenotes();

  if (!window.__conanPostFootnotesResizeBound) {
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildSidenotes, 120);
    });
    window.__conanPostFootnotesResizeBound = true;
  }
}

declare global {
  interface Window {
    __conanPostFootnotesResizeBound?: boolean;
  }
}
