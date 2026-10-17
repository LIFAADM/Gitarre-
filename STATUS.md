# GuitarCoach – Stand der Umsetzung

Stand: Phase 1 (MVP) vollständig umgesetzt, dazu wesentliche Teile von Phase 2 (Mikrofon-Lernkontrolle, Lernplan, Statistiken, erweiterte Importe) und Phase 3 (Tab-Editor, JSON-Export, Datensicherung).

## Vollständig funktionsfähig

| Bereich | Umfang |
| --- | --- |
| App-Grundgerüst | React/TypeScript/Vite, deutsche Oberfläche, 5-Punkte-Navigation (Start, Lernen, Songs, Üben, Werkzeuge) + Fortschritt/Einstellungen, PWA mit Offline-Precache, Icons, Safe Areas |
| Dashboard | Begrüßung, Tagesziel-Ring, Serie, Lernniveau, aktuelle Lektion, regelbasierte Empfehlungen, zuletzt gespielte Songs, Lieblingslied, Schnellstart – alles aus echten Daten |
| Stimmgerät | Mikrofon, YIN-Tonerkennung mit Stabilisierung, Note/Frequenz/Cent, Nadel, zu tief/zu hoch/richtig, automatische und manuelle Saitenwahl, Referenztöne (Analyse pausiert dabei), Pegelanzeige, Fehlertexte, Haken je Saite, Toleranz/Empfindlichkeit/Kammerton einstellbar |
| Griffbrett | 12–19 Bünde, Tippen spielt Ton, Note/Frequenz/Saite/Bund/Finger, Rechts-/Linkshänder, zwei Ansichten, Tonnamen, Modus „Zeige mir den Ton“ mit echter Zählung |
| Metronom | 40–220 BPM, Start/Stopp, Taktarten 2/4 3/4 4/4 6/8, Akzent, Unterteilungen, Tap-Tempo, Lautstärke, optischer Taktgeber, Audio-Scheduler; integriert in Player (mit Einzähler) und Lektionen |
| Tab-Darstellung | Eigener SVG-Renderer: 6 Linien, Bundzahlen, Rhythmushälse/Balken/Fähnchen, Pausen, Punktierungen, Triolen, Bindungen, H/P/Slide/Vibrato/P.M./Dead/Harmonic, Fingersatz, Text, Taktnummern, Abschnitte, Tempo, Zoom, Antippen einzelner Noten |
| Song-Player | Play/Pause/Stopp/Anfang, nächste/vorherige Note (Einzeltonmodus), Tempo 25/50/75/100 % + 25–150 % fein (Wiedergabe tatsächlich skaliert), Schleife per Takt-Stepper oder Antippen, Metronom + Einzähler, Spurauswahl, Griffbrett mit aktueller Note, automatisches Scrollen, Abspielmarke, Fortschrittsbalken, Durchlauf-Erkennung, Umschalten Tabulatur ↔ „Noten + Tab“ (alphaTab-Partituransicht, Standard: Tabs) |
| Vereinfachung | „Vereinfachte Übungsversion erzeugen“ für jede Version: monophone Melodiestimme (höchster Ton), ohne Spieltechniken, Sechzehntel → Achtel, tiefe Lage bevorzugt; als „Vereinfacht“ gekennzeichnet und als eigene Version gespeichert |
| Klang | Eigener Karplus-Strong-Nylonsaiten-Synth (getestet auf exakte Tonhöhe), saitenweise Dämpfung, Pausen dämpfen, Palm Mute/Staccato/Dead Note, Tiefpass/Körperresonanz/Kompressor |
| Songbibliothek | 30 Wunsch-Songs vorangelegt; 6 gemeinfreie Lieder mit 14 spielbaren Versionen (Anfänger/Leicht/Mittel mit unterschiedlichen Notendaten); 24 geschützte Songs mit Status „Tab-Datei nötig“, Originaltempo, Schwierigkeit, Genre, Vorübungen; Suche, Filter, Favoriten, Fortschritt; eigene Songs anlegen |
| Import | Guitar Pro 3–8, MusicXML (.xml/.musicxml/.mxl), alphaTex, MIDI, GuitarCoach-JSON; Formaterkennung, Vorschau, Spurauswahl, Zuordnung zu Song, Warnhinweise, Beispieldateien; Import läuft lokal |
| Gitarrenschule | 7 Kapitel, 44 Lektionen mit Lernziel, Erklärung, konkreter Übung (Stimmgerät, Griffbrett, Metronom, Übungs-Tab, Lied), Tipps, Selbstkontrolle, Abschluss + Speicherung, nächste Lektion; interaktive Einführung „Tabs verstehen“ (9 Schritte, anklickbare Beispiele) |
| Übungen | 22 eigene technische Übungen (leere Saiten, p-i-m-a, Wechselschlag, Bund 1–3, Chromatik, Tonleiter, Rhythmus, Riffs, Offbeat, Fingerpicking, Hammer-on/Pull-off, Slide/Vibrato, Pentatonik, Solo) – als Vorübungen zu den geschützten Songs verknüpft |
| Spiel mit (Phase 2) | Erwartete Note + Griffbrett, Mikrofon-Analyse, grün/gelb/rot, zu tief/zu hoch/Oktave/falsch, Toleranz und Mindestdauer einstellbar, Onset-Erkennung gegen Doppelwertung, Referenzton pausiert Analyse, Überspringen/Zurück/Pausieren, Ergebnis gespeichert (Sitzung, Song-Trefferquote, Lektion) |
| Üben/Lernplan | Tagesplan (Stimmen/Fingerübungen/Technik/Song, skaliert aus Tagesziel) mit echten Minuten, Wochenziel, Wiederholungsbedarf aus schwachen Trefferquoten, Übungsbibliothek |
| Fortschritt | Minuten gesamt/heute/Woche, Übungstage, Serie, 7-Tage-Diagramm, 30-Tage-Summe, Bestleistungen, Lernziele (vorgegeben + eigene), 8 Erfolge mit Datum, schwierige Passagen, Sitzungsliste |
| Tab-Editor (Phase 3) | Griffbrett-Eingabe, Notenlängen, Punktierung, Pausen, Akkorde, Cursor, Verschieben, Löschen, Abspielen, Speichern als Song, Wieder öffnen, Export als GuitarCoach-JSON (Import über Import-Seite) |
| Einstellungen | Name, Tagesziel, Wochenziel, Notennamen H/B, Linkshänder, Griffbrett-Ansicht, Fingersatz, Auto-Scroll, Einzähler, Tab-Größe, Kammerton, Toleranzen, Empfindlichkeit, Lautstärken, Datensicherung (Export/Import), Fortschritt zurücksetzen, alles löschen, Speicherbelegung, Mikrofonstatus, Lizenzen, iPhone-Installationshinweis |
| Speicherung | IndexedDB (Dexie) für Songs, Versionen, Importdateien, Sitzungen, Lektions-/Songfortschritt, Einstellungen, Erfolge, Ziele; idempotentes Seeding; JSON-Backup |

## Teilweise umgesetzt / mit Einschränkungen

- **Spiel mit** bewertet einzelne Töne. Bei Akkorden genügt ein erkannter Ton des Akkords; Rhythmus (zu früh/zu spät) wird nicht bewertet. Sehr schnelle Tonfolgen (16tel bei hohem Tempo) sind durch die Mindest-Stabilisierungsdauer nur langsam prüfbar.
- **MIDI-Import**: Griffpositionen werden heuristisch berechnet (erste Lage bevorzugt) und sind im Editor noch nicht korrigierbar; Dauern werden auf 16tel gerundet.
- **Wiederholungen** werden in der Tab-Ansicht entrollt (jeder Durchgang sichtbar) statt mit Wiederholungszeichen dargestellt.
- **Mehrstimmige Takte** (z. B. Melodie + Bass in getrennten Stimmen) werden abgespielt; gezeichnet werden alle Stimmen, Rhythmushälse nur für Stimme 1.
- **Noten-Ansicht** ist eine statische Partitur (alphaTab-Renderer im Hauptthread): keine Abspielmarke, kein Antippen; für importierte Dateien wird die Originaldatei gerendert, sonst ein alphaTex-Export des internen Modells (Bends/Harmonics gehen dabei verloren).
- **Automatische Vereinfachung** wählt pro Schlag den höchsten Ton; bei Begleitspuren (Bass) ist das nicht immer die Melodie.
- **Importierte Rohdateien** werden gespeichert, sind aber nicht Teil der JSON-Sicherung (die daraus erzeugten Noten schon).
- **Übungszeit** zählt die Zeit auf einer Übungs-/Player-Seite (bei Stimmgerät und Metronom nur bei aktivem Betrieb), nicht die tatsächlich gespielten Töne.

## Noch nicht umgesetzt

- Import einfacher ASCII-Text-Tabs mit manueller Festlegung der Notenlängen.
- Zerlegung anspruchsvoller Abschnitte in automatisch erzeugte Kurzübungen (die Schleife deckt das manuell ab).
- Audiodatei-Import (MP3/WAV/M4A) und manuell synchronisierter Mitspielmodus.
- Mehrspurige gleichzeitige Wiedergabe (aktuell eine Spur wählbar).
- Capacitor-Paketierung als native iPhone-App.

## Bekannte Einschränkungen

- iOS erlaubt Audio erst nach einer Berührung; die App schaltet Audio bei der ersten Interaktion frei.
- Safari beschränkt die Mikrofonnutzung auf HTTPS (oder localhost).
- Die Erkennung der tiefen E-Saite (82 Hz) braucht ein sauberes, einzeln angeschlagenes Signal; bei Rauschen zeigt die App bewusst „–“ statt eines Ergebnisses.
- Die Visualisierung läuft gegen die Audio-Ausgabelatenz (auf iOS ~20–40 ms); sie wird über `outputLatency` kompensiert, soweit der Browser den Wert liefert.
- Sehr lange Importe (hunderte Takte) werden vollständig gerendert; kein virtuelles Scrollen.

## Testergebnisse (automatisiert)

- `npm run typecheck`: fehlerfrei
- `npm run lint`: fehlerfrei
- `npm test`: 24 Dateien, 153 Tests bestanden
- `npm run build`: erfolgreich (Precache ca. 3,1 MB inkl. alphaTab-Import und Bravura-Notenschrift)
- `npm run e2e` (Playwright, iPhone-Viewport in Chromium): 14 Smoke-Tests bestanden – Dashboard, Bibliothek (Test 10), Happy Birthday mit Tempo 50 % und Einzelton (Tests 3/6), Schleife (Test 7), Guitar-Pro-Import (Test 5), Fortschritt nach Neuladen (Test 8), Gitarrenschule, Stimmgerät ohne Mikrofon zeigt keinen Ton (Test 1 teilweise), Griffbrett (Test 2), Metronom, Offline-Betrieb (Test 9), Noten-Ansicht, Vereinfachung, Spiel-mit-Start (Test 11 teilweise)

## Manuelle Tests, die noch auf einem echten iPhone nötig sind

1. **Stimmgerät mit echter Gitarre** (Test 1): alle sechs Saiten, Erkennungsgeschwindigkeit, Verhalten bei Nebengeräuschen, Empfindlichkeitsstufen.
2. **Spiel-mit-Modus** (Test 11): Einzeltöne der Übung „Die sechs leeren Saiten“, Doppelwertung bei gleichen Folgetönen, Toleranz 30 Cent sinnvoll?
3. **Lautstärke und Klang** des Synths über iPhone-Lautsprecher und Kopfhörer; Lautstärkebalance Metronom/Gitarre.
4. **Home-Bildschirm-Installation**, Start im Vollbild, Safe Areas im Hoch- und Querformat, Dynamic Island.
5. **Unterbrechungen**: eingehender Anruf, App-Wechsel, Bildschirmsperre – Wiedergabe pausiert, Mikrofon freigegeben, danach weiter nutzbar.
6. **Offline-Betrieb** nach Installation (Flugmodus): Lektionen, Player, importierte Songs.
7. **Dateiimport** über die Dateien-App (Guitar Pro aus iCloud Drive) und Export/Teilen der JSON-Sicherung.
8. **Speicherverhalten** nach mehreren Tagen ohne Nutzung (Safari-Datenbereinigung) – Backup-Routine prüfen.
