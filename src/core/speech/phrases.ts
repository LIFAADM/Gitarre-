/**
 * Textbausteine für die Sprachausgabe. In v2 wird nur noch der optionale gesprochene Einzähler genutzt;
 * `chunkText` braucht die Kapselung in `speech.ts` für längere Texte.
 */

const NUMBER_WORDS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'] as const;

/** Zahlwort 0–12, darüber Ziffern. */
export function numberWord(n: number): string {
  const i = Math.round(n);
  return i >= 0 && i < NUMBER_WORDS.length ? NUMBER_WORDS[i]! : String(i);
}

/** Zählworte für den Einzähler („eins, zwei, drei, vier“). */
export function countWords(beats: number): string[] {
  const n = Math.max(1, Math.min(12, Math.round(beats)));
  return Array.from({ length: n }, (_, i) => numberWord(i + 1));
}

/** Teilt Text in kurze Abschnitte (Satzgrenzen), damit Browser lange Ausgaben nicht abbrechen. */
export function chunkText(text: string, maxLength = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = '';
  const push = (): void => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const s of sentences) {
    if (s.length > maxLength) {
      push();
      let rest = s;
      while (rest.length > maxLength) {
        let cut = rest.lastIndexOf(', ', maxLength);
        if (cut < maxLength / 2) cut = rest.lastIndexOf(' ', maxLength);
        if (cut <= 0) cut = maxLength;
        chunks.push(rest.slice(0, cut + (rest[cut] === ',' ? 1 : 0)).trim());
        rest = rest.slice(cut).replace(/^[,\s]+/, '');
      }
      current = rest;
      continue;
    }
    if ((current + ' ' + s).trim().length > maxLength) push();
    current = current ? `${current} ${s}` : s;
  }
  push();
  return chunks;
}
