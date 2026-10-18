/** Verbindet Klassennamen und ignoriert falsy-Werte. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
