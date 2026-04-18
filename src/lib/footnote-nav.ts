type ClosestCapable = {
  closest(selector: string): ClosestCapable | null;
};

function isClosestCapable(value: unknown): value is ClosestCapable {
  return (
    typeof value === "object" &&
    value !== null &&
    "closest" in value &&
    typeof (value as { closest?: unknown }).closest === "function"
  );
}

export function shouldHandleFootnoteItemClick(target: unknown | null): boolean {
  if (!isClosestCapable(target)) return true;
  if (target.closest(".fn-back")) return true;

  return target.closest("a[href], button, input, textarea, select, summary") === null;
}
