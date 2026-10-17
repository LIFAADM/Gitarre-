// Erzeugt Beispieldateien (eigene Kompositionen) zum Testen des Imports: GP7 (.gp) via alphaTab-Exporter und MusicXML.
import * as alphaTab from '@coderline/alphatab';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('public/samples', { recursive: true });
const settings = new alphaTab.Settings();

// Eigene kleine Etüde in E-Moll (GuitarCoach), zwei Spuren
const tex = `\\title "GuitarCoach Etüde Nr. 1" \\artist "GuitarCoach" \\tempo 84 .
\\track "Melodie" \\instrument 24
\\ts 4 4 \\ro 0.1.4 2.1.4 3.1.4 2.1.4 | 0.1.4 3.2.4 0.2.2 | \\rc 2 2.3.8 0.3.8 2.3.8 4.3.8 0.2.4 3.2.4 | 0.1.1 |
\\track "Bass" \\instrument 24
\\ts 4 4 \\ro 0.6.2 0.6.2 | 3.5.2 3.5.2 | \\rc 2 0.5.2 2.5.2 | 0.6.1 |`;
const score = alphaTab.importer.ScoreLoader.loadAlphaTex(tex, settings);
const gp = new alphaTab.exporter.Gp7Exporter().export(score, settings);
writeFileSync('public/samples/guitarcoach-etuede-1.gp', gp);
console.info('✓ public/samples/guitarcoach-etuede-1.gp', gp.length, 'bytes');

// MusicXML-Beispiel (eigene Melodie in G-Dur) mit Tabulatur
const notes = [
  ['G', 4, 0, 3, 0], ['A', 4, 0, 3, 2], ['B', 3, 0, 2, 0], ['C', 4, 0, 2, 1],
  ['D', 4, 0, 2, 3], ['E', 4, 0, 1, 0], ['D', 4, 0, 2, 3], ['B', 3, 0, 2, 0],
];
let measures = '';
for (let m = 0; m < 4; m++) {
  const bar = notes.slice((m % 2) * 4, (m % 2) * 4 + 4);
  const body = bar
    .map(([step, octave, alter, string, fret]) =>
      `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch><duration>2</duration><type>quarter</type><notations><technical><string>${string}</string><fret>${fret}</fret></technical></notations></note>`,
    )
    .join('');
  const attrs =
    m === 0
      ? `<attributes><divisions>2</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines>${[['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([s, o], i) => `<staff-tuning line="${i + 1}"><tuning-step>${s}</tuning-step><tuning-octave>${o}</tuning-octave></staff-tuning>`).join('')}</staff-details></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>92</per-minute></metronome></direction-type><sound tempo="92"/></direction>`
      : '';
  measures += `<measure number="${m + 1}">${attrs}${body}</measure>`;
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><work><work-title>GuitarCoach Etüde Nr. 2</work-title></work><identification><creator type="composer">GuitarCoach</creator></identification>
<part-list><score-part id="P1"><part-name>Gitarre</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
writeFileSync('public/samples/guitarcoach-etuede-2.musicxml', xml);
console.info('✓ public/samples/guitarcoach-etuede-2.musicxml');
