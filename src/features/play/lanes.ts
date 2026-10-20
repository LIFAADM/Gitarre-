/** Saitenspuren der Spielansicht: Nummer, Farbe, Name. Saite 1 ist die hohe E-Saite. */
export interface Lane {
  number: number;
  color: string;
  name: string;
}

export const LANES: readonly Lane[] = [
  { number: 6, color: '#c0564f', name: 'E' },
  { number: 5, color: '#c97a2f', name: 'A' },
  { number: 4, color: '#c9aa3a', name: 'D' },
  { number: 3, color: '#4aa36f', name: 'G' },
  { number: 2, color: '#4b7fc4', name: 'H' },
  { number: 1, color: '#8b67c4', name: 'E' },
];

export function lane(number: number): Lane {
  const l = LANES.find((x) => x.number === number);
  if (!l) throw new RangeError(`Ungültige Saite: ${number}`);
  return l;
}
