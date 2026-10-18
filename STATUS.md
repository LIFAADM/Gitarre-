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
| Import | Guitar Pro 3–8, MusicXML (.xml/.musicxml/.mxl), alphaTex, MIDI, ASCII-Text-Tabs (Dauern geschätzt, Optionen für kleinste Notenlänge/Taktart/Taktstriche, deutlicher Hinweis), GuitarCoach-JSON; Formaterkennung, Vorschau, Spurauswahl, Zuordnung zu Song, Warnhinweise, Beispieldateien; Import läuft lokal |
| Mitspielmodus | Eigene Audiodatei (MP3/WAV/M4A) dem Song zuordnen, Speicherplatzprüfung, Zeitmarken „Takt = Sekunde“ (eine Marke = Startversatz, zwei oder mehr = Tempo der Aufnahme), Tabs laufen synchron, Takt-Sprünge, Abschnittsschleife, Tempo 50/75/100 % mit Tonhöhenerhalt |
| Mehrspurigkeit | Hauptspur anzeigen/üben, weitere Spuren eines Imports mit einstellbarer Lautstärke mitspielen (eigene Dämpfungskanäle je Spur) |
| Bereitstellung | GitHub-Actions-CI (Typen, Lint, Tests, Build, E2E) und GitHub-Pages-Deployment mit konfigurierbarem Basis-Pfad; Capacitor-Konfiguration und Skripte für die spätere iOS-App |
| Gitarrenschule | 7 Kapitel, 44 Lektionen mit Lernziel, Erklärung, konkreter Übung (Stimmgerät, Griffbrett, Metronom, Übungs-Tab, Lied), Tipps, Selbstkontrolle, Abschluss + Speicherung, nächste Lektion; interaktive Einführung „Tabs verstehen“ (9 Schritte, anklickbare Beispiele) |
| Übungen | 22 eigene technische Übungen (leere Saiten, p-i-m-a, Wechselschlag, Bund 1–3, Chromatik, Tonleiter, Rhythmus, Riffs, Offbeat, Fingerpicking, Hammer-on/Pull-off, Slide/Vibrato, Pentatonik, Solo) – als Vorübungen zu den geschützten Songs verknüpft |
| Spiel mit (Phase 2) | Erwartete Note + Griffbrett, Mikrofon-Analyse, grün/gelb/rot, zu tief/zu hoch/Oktave/falsch, Toleranz und Mindestdauer einstellbar, Onset-Erkennung gegen Doppelwertung, Referenzton pausiert Analyse, Überspringen/Zurück/Pausieren, Ergebnis gespeichert (Sitzung, Song-Trefferquote, Lektion) |
| Kinder-Modus | Eigener Bereich `/kinder` ohne untere Navigation, Start über Dashboard oder Einstellungen; bleibt nach Neuladen aktiv (App öffnet auf der Kinder-Startseite), Verlassen nur über Elternsperre (Summe zweier Zahlen 4–9). Saiten als Regenbogen von dick (Rot, Saite 6) bis dünn (Lila, Saite 1), Darstellung wie der Blick auf die eigene Gitarre. Spiele: „Saiten“ (antippen, hören, Farbname gesprochen, Stern für alle sechs), „Welche Saite?“ (5 Runden, ab Runde 4 zwei Saiten nacheinander; Antwort per Mikrofon – nächstgelegene Leersaite bei stabiler Tonhöhe – oder Antippen; nach zwei Fehlversuchen leuchtet die richtige Saite), „Lieder“ (Regenbogen rauf und runter, Alle meine Entchen, Hänschen klein, Bruder Jakob – alle in erster Lage, Bünde 0–3; Vorspielen mit Hervorhebung, Mitspielen mit Mikrofon, Oktavfehler zählen als richtig, „Weiter“-Taste ohne Mikrofon; Griffbrett zeigt die Position), „Klatschen“ (hüpfender Ball bei 72 Schlägen pro Minute, ein Takt Vorlauf, vier Takte Wertung, Treffer bei ±180 ms über Pegelsprung im Mikrofon oder Trommel-Taste). Sterne (0–3 je Spiel, bei Liedern zählt die beste Wertung) im Meta-Speicher; jede Seite spricht ihre Anleitung beim Öffnen und auf Knopfdruck |
| Coach-Tipps | Regelbasierte Hinweise aus echten Messwerten, erst bei wiederholtem Muster, höchstens einer alle 12–15 s, pro Sitzung je Tipp einmal: Spiel-mit-Modus (ein Bund daneben, Nachbarsaite, falsche Oktave = falsche Saite, zu tief = dichter hinter dem Bundstäbchen drücken, zu hoch = Saite nicht seitlich ziehen, leere Saiten verstimmt = nachstimmen, drei Fehler in Folge = Pause und Referenzton, 6 s kein Signal = kräftiger anschlagen, Lob bei 5 und 10 Treffern in Folge, Ergebnis-Tipp mit schwierigen Takten), Stimmgerät (weit daneben = leere Saite einzeln spielen, Überdrehen tief/hoch/tief, Saite rutscht nach dem Stimmen wieder ab, lange deutlich daneben = mutiger drehen), Player (nach Durchlauf: nächster Temposchritt; neues Stück im vollen Tempo: erst 50 %), Startseite (Tipp des Tages: datengetrieben bei Pause nach mehreren Übungstagen, langer Sitzung, niedriger Trefferquote oder langer Serie, sonst einer von 24 festen Tipps pro Kalendertag); abschaltbar, mit Vorlesen |
| Sprachbegleitung | Deutsche Systemstimme über die Web Speech API, offline, kein Netz: „Lektion vorlesen“ und „Anweisung vorlesen“ in jeder Lektion (Markdown wird in Sprechtext gewandelt, Abkürzungen und Saitenfolgen ausgeschrieben), Stimmgerät-Ansagen erst bei stabiler Messung und ohne Wiederholung („E-Saite, zu tief“, „E stimmt“, „Alle sechs Saiten gestimmt“), Spiel-mit-Modus sagt Ziel-Ton mit Saite und Bund an, bewertet hörbar („Richtig“, „Fast, etwas zu tief“, „Falsch, das war Gis“) und liest das Ergebnis vor, gesprochener Einzähler „eins, zwei, drei, vier“ synchron zu den Klicks, Abschnittsansagen („Refrain“) im Player; Sprechtempo und Stimme wählbar, jeder Bereich einzeln abschaltbar; während die App spricht, wertet die Tonhöhenerkennung nichts aus (plus 350 ms Nachlauf), damit die eigene Stimme nicht als Ton zählt |
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
- **Text-Tab-Import** schätzt Notenlängen aus Zeichenabständen (häufigster Abstand = gewählte Grundlänge); bei unregelmäßig gesetzten Tabs ist Nacharbeit im Editor nötig. Mehrstimmige Text-Tabs werden auf eine Stimme reduziert.
- **Mitspielmodus** synchronisiert ausschließlich manuell über Zeitmarken; `playbackRate` unter 100 % hält die Tonhöhe nur, wenn der Browser `preservesPitch` unterstützt (Safari ab 15 ja).
- **Capacitor** ist konfiguriert, die native iOS-App wurde ohne Mac/Xcode nicht gebaut.
- **Sprachbegleitung** hängt von den installierten Systemstimmen ab (iOS: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch; eine „erweiterte“ Stimme klingt deutlich besser). Die Zählworte des Einzählers starten per Timer etwa 80 ms vor dem Klick; die tatsächliche Verzögerung der Sprachausgabe schwankt je nach Gerät um einige zehn Millisekunden. Spracheingabe (Befehle per Stimme) ist bewusst nicht enthalten: Safari würde die Aufnahme an Apple-Server schicken, was der Regel „kein Mikrofon-Ton verlässt das Gerät“ widerspricht.
- **Kinder-Modus**: Die Spracherkennung der Saiten setzt eine einigermaßen gestimmte Gitarre voraus (Toleranz 150 Cent zur nächsten Leersaite). Das Klatsch-Spiel erkennt Anschläge über Pegelsprünge; in lauter Umgebung werden Nebengeräusche mitgezählt, dafür gibt es die Trommel-Taste. Die Lieder verlangen Bünde 1–3 und damit meist Hilfe eines Erwachsenen bei Vierjährigen; „Regenbogen rauf und runter“ kommt ohne Greifen aus. Es gibt keine Kinderstimme: gesprochen wird die eingestellte Systemstimme.
- **Kopfhörer-Steuerung** (Media Session API) ist als experimentell gekennzeichnet: iOS zeigt Medien-Steuerung nur, wenn ein `<audio>`-Element spielt, daher läuft bei aktivierter Option eine stumme Tonspur mit. Auf echter Hardware noch nicht geprüft.
- **Automatische Vereinfachung** wählt pro Schlag den höchsten Ton; bei Begleitspuren (Bass) ist das nicht immer die Melodie.
- **Importierte Rohdateien** werden gespeichert, sind aber nicht Teil der JSON-Sicherung (die daraus erzeugten Noten schon).
- **Übungszeit** zählt die Zeit auf einer Übungs-/Player-Seite (bei Stimmgerät und Metronom nur bei aktivem Betrieb), nicht die tatsächlich gespielten Töne.

## Noch nicht umgesetzt

- Zerlegung anspruchsvoller Abschnitte in automatisch erzeugte Kurzübungen (die Schleife deckt das manuell ab).
- Rhythmus-Bewertung (zu früh/zu spät) und Akkorderkennung im Spiel-mit-Modus.
- Sprachbefehle (Spracheingabe) – siehe Einschränkungen; freihändig bedienbar sind Spiel-mit-Modus (automatisches Weiterschalten) und, experimentell, Play/Pause über Kopfhörer-Tasten.
- Tatsächlicher Xcode-Build der Capacitor-App (nur auf macOS möglich).

## Bekannte Einschränkungen

- iOS erlaubt Audio erst nach einer Berührung; die App schaltet Audio bei der ersten Interaktion frei.
- Safari beschränkt die Mikrofonnutzung auf HTTPS (oder localhost).
- Die Erkennung der tiefen E-Saite (82 Hz) braucht ein sauberes, einzeln angeschlagenes Signal; bei Rauschen zeigt die App bewusst „–“ statt eines Ergebnisses.
- Die Visualisierung läuft gegen die Audio-Ausgabelatenz (auf iOS ~20–40 ms); sie wird über `outputLatency` kompensiert, soweit der Browser den Wert liefert.
- Sehr lange Importe (hunderte Takte) werden vollständig gerendert; kein virtuelles Scrollen.

## Testergebnisse (automatisiert)

- `npm run typecheck`: fehlerfrei
- `npm run lint`: fehlerfrei
- `npm test`: 31 Dateien, 162 Tests bestanden
- `npm run build`: erfolgreich (Precache ca. 3,5 MB inkl. alphaTab-Import und Bravura-Notenschrift)
- `npm run e2e` (Playwright, iPhone-Viewport in Chromium): 18 Tests bestanden – Dashboard, Bibliothek (Test 10), Happy Birthday mit Tempo 50 % und Einzelton (Tests 3/6), Schleife (Test 7), Guitar-Pro-Import (Test 5), Fortschritt nach Neuladen (Test 8), Gitarrenschule, Griffbrett (Test 2), Metronom, Offline-Betrieb (Test 9), Noten-Ansicht, Vereinfachung, Spiel-mit-Start; mit simuliertem Mikrofon (synthetische Gitarrentöne über Chromiums Fake-Audio-Capture): Stimmgerät erkennt A2 = 110 Hz als richtig gestimmt (Test 1), Spiel-mit-Modus erkennt die gespielten leeren Saiten und zählt Treffer (Test 11)
- GitHub Actions führt dieselbe Pipeline bei jedem Push aus
- GitHub-Pages-Deployment: live unter https://lifaadm.github.io/Gitarre-/ (HTTPS, Mikrofon und Installation auf dem Home-Bildschirm möglich). Veröffentlicht wird automatisch bei jedem Push auf `main`; die von GitHub angelegte Umgebungsregel `github-pages` erlaubt nur diesen Branch. Vorher nötig waren: Repository öffentlich stellen (GitHub Free bietet Pages nur dort) und Settings → Pages → Source „GitHub Actions“.

## Manuelle Tests, die noch auf einem echten iPhone nötig sind

Die Signalkette (Mikrofon → YIN → Stabilisierung → Anzeige/Bewertung) ist automatisiert mit synthetischen Gitarrentönen geprüft. Offen bleibt, was nur echte Hardware zeigt:

0. **Sprachbegleitung**: Stimme und Verständlichkeit der deutschen Systemstimme, Lautstärke im Verhältnis zum Gitarrenklang, Einzähler-Timing zu den Klicks, dass die Mikrofon-Auswertung während der Ansagen wirklich pausiert (keine Fehlwertungen durch die eigene Stimme); Kopfhörer-Taste bei aktivierter experimenteller Option.
1. **Stimmgerät mit echter Gitarre** (Test 1): Nebengeräusche im Raum, Raumhall, Empfindlichkeitsstufen, Abstand zum iPhone-Mikrofon, tiefe E-Saite bei leisem Anschlag.
2. **Spiel-mit-Modus** (Test 11): Verhalten bei echten Anschlaggeräuschen, Doppelwertung bei gleichen Folgetönen, ob Toleranz 30 Cent und Mindestdauer 120 ms angenehm sind.
3. **Lautstärke und Klang** des Synths über iPhone-Lautsprecher und Kopfhörer; Lautstärkebalance Metronom/Gitarre.
4. **Home-Bildschirm-Installation**, Start im Vollbild, Safe Areas im Hoch- und Querformat, Dynamic Island.
5. **Unterbrechungen**: eingehender Anruf, App-Wechsel, Bildschirmsperre – Wiedergabe pausiert, Mikrofon freigegeben, danach weiter nutzbar.
6. **Offline-Betrieb** nach Installation (Flugmodus): Lektionen, Player, importierte Songs.
7. **Dateiimport** über die Dateien-App (Guitar Pro aus iCloud Drive) und Export/Teilen der JSON-Sicherung.
8. **Speicherverhalten** nach mehreren Tagen ohne Nutzung (Safari-Datenbereinigung) – Backup-Routine prüfen.
