# PLAN.md – GuitarCoach v2

Stand: 2026-10-19 · Aktuelle Phase: **0 – Plan & Aufräumen** (Branch `v2/phase-0-plan-und-aufraeumen`)

Das Prinzip steht in `CLAUDE.md`: Spielen → App hört zu → sofortiges Feedback → Sterne → nächster Schritt.

## Phasenübersicht

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0 | Tag `v1-guitarcoach`, CLAUDE.md, PLAN.md, Altlasten entfernen, neues Navigationsgerüst | in Arbeit |
| 1 | Neue Audio-Kette (AudioWorklet), Kalibrierung, Erkennungs-Labor, Stimmgerät umgestellt | offen |
| 2 | Erkennung an echten Aufnahmen abstimmen, Benchmark in der CI, Zielwerte erreichen | offen |
| 3 | Spielansicht mit Bewertung, Modi, Ergebnisbildschirm, Sterne | offen |
| 4 | Lernpfad Level 1–3 mit Inhalten, Startseite „Nächster Schritt“, Einstufungstest | offen |
| 5 | Akkorderkennung, Akkordbibliothek, Level 4–5 | offen |
| 6 | Stücke-Bibliothek, Erfahrungspunkte, Serie, Tagesziel, Wochen-Challenge, Statistik | offen |
| 7 | Feinschliff: Offline, Performance, Testcheckliste fürs iPhone | offen |

## Phase 0 – Plan & Aufräumen

### Erledigt
- Tag `v1-guitarcoach` auf `main` (b6820e0) gesetzt und gepusht. Wiederherstellen: `git checkout v1-guitarcoach`.
- `CLAUDE.md` (Prinzip, Regeln, Zielarchitektur) und diese `PLAN.md`.

### Löschliste (wird erst nach Freigabe ausgeführt)

**Kinder-Modus und Kinder-Schule komplett**
- `src/features/kids/` (alle Dateien), Routen `/kinder/*`, Einstellungen `kidsMode`, `speechKids`, Umleitung der Startroute, Kinder-Karten in Dashboard und Einstellungen, Feld `forKids` am Song, Kinder-Fortschritt im Meta-Speicher.
- Behalten als Grundlage für Phase 3: die Zeitsteuerung der Bahn (`highwayEngine.ts`, `NoteHighway.tsx`, `features/highway/timeline.ts` mit Tests) wandert nach `src/features/play/` und wird dort zur einen Spielansicht ausgebaut.

**Import und Tab-Editor**
- `src/features/songs/ImportPage.tsx`, `AddSongPage.tsx`, `src/features/editor/`, `src/core/import/` bis auf `alphaTabImport.ts` (alphaTex → Modell, nötig für eigene Inhalte) und `alphaTexExport.ts`; dazu `midiImport.ts`, `textTabImport.ts`, `formats.ts`, `importFile.ts`, `gcjson.ts`, Beispieldateien unter `public/samples/`, Tabelle `importFiles`.

**Mitspielmodus und Mehrspur**
- `src/features/playalong/`, Tabelle `audioSyncs`, `buildMixPlan`/Begleitspuren im Player, Spurauswahl.

**Geschützte Songs**
- Alle Einträge mit `rightsStatus: 'needs-import'` (Elvis, Beatles, Metallica, NDW, Rock, Last Christmas, 29 Kinder-Hits) samt Vorübungs-Verknüpfungen, Genre „Kinder-Hits“. Gemeinfreie Arrangements (Happy Birthday, Jingle Bells, O Tannenbaum, Stille Nacht, Alle Jahre wieder, Morgen kommt der Weihnachtsmann) bleiben und werden in Phase 6 in Datendateien überführt.

**Separate Seiten**
- „Spiel mit“ (`src/features/listen/ListenPage.tsx`, Routen `/spiel-mit`), Mitspiel-Bahn-Seite der Erwachsenen (`features/highway/HighwayPage.tsx`, geht in Phase 3 in der Spielansicht auf), Griffbrett-Seite (`FretboardPage.tsx`; die Komponente `Fretboard.tsx` bleibt und wird Teil der Spielansicht), Übungsseiten `PracticePage`/`ExercisePage`, alte Gitarrenschule (`features/lessons/`, 44 Lektionen, „Tabs verstehen“), Dashboard, Fortschrittsseite und Lernziele in der alten Form. Der Lernpfad ersetzt sie in Phase 4, Fortschritt kommt in Phase 6 neu unter dem Profil.
- Player-Varianten: `SongPlayer` mit Spur-Sheet, Zoom, Ansichtsumschaltung bleibt **vorläufig** als „Vorhören“ unter Stücke (Tab + Wiedergabe + Tempo), bis die Spielansicht in Phase 3 steht; danach wird er gelöscht.

**Sprachbegleitung**
- `useSpeech`, Vorlesen von Lektionen, Stimmgerät-Ansagen, Spiel-mit-Ansagen, Abschnittsansagen, Tipps vorlesen, Einstellungskarte. Bleibt: `core/speech/speech.ts` (Kapselung) und die Zählworte für einen **optionalen gesprochenen Einzähler**, Einstellung standardmäßig aus.

**Coach-Tipps**
- Bleiben in `core/coach/`, aber nur noch für den Ergebnisbildschirm (Phase 3). Tipp des Tages, Stimmgerät-Tipps und Live-Tipps im Spiel-mit-Modus werden entfernt.

**Sonstiges**
- `STATUS.md`, `ROADMAP.md`, `ARCHITECTURE.md` (Inhalt in CLAUDE.md und hier), Media-Session-Kopfhörersteuerung, Backup/Wiederherstellung in alter Form (kommt mit Schema v2 neu), Capacitor-Konfiguration bleibt.
- Tests und E2E-Tests der gelöschten Funktionen; Zählungen in verbleibenden Tests anpassen.

### Behalten (Bausteine für v2)
- `src/core/music/` (Notennamen, Frequenzen, Stimmung, Griffbrett, Dauern, Datenmodell, Tab-Notation, Abspielplan, Vereinfachung).
- `src/core/audio/`: Karplus-Strong-Nylonsynth, Metronom-Scheduler, AudioContext-Verwaltung, Tab-Player (Wiedergabe für „Vorspielen“). Mikrofon-Kette (`mic.ts`, `usePitchDetection`, YIN, PitchTracker) bleibt bis Phase 1 für das Stimmgerät und wird dort durch die Worklet-Kette ersetzt.
- `src/components/ui/`, Tailwind-Design, `Fretboard.tsx`, `TabView`/`ScoreView` (alphaTab + Bravura).
- Dexie-Speicher: neues Schema v2 mit eigenem Datenbanknamen (`guitarcoach-v2`); alte Übungsdaten werden nicht übernommen.
- CI-Workflow, Pages-Deployment, Playwright mit Fake-Mikrofon.
- Stimmgerät-Oberfläche (`TunerWidget.tsx`), Metronom.

### Neues Navigationsgerüst (Phase 0)
- Untere Navigation: **Start · Lernpfad · Stücke · Werkzeuge**; Profil-Symbol oben rechts → Fortschritt, Einstellungen.
- Start: Platzhalter „Nächster Schritt“ mit einer Hauptaktion (bis Phase 4: Stimmgerät starten), Stimm-Hinweis.
- Lernpfad: Level-Gerüst 1–7 als Liste, Inhalte folgen ab Phase 4.
- Stücke: gemeinfreie Arrangements mit „Vorhören“ (vorläufiger Player).
- Werkzeuge: Stimmgerät, Metronom, Akkordbibliothek (Platzhalter bis Phase 5).
- Profil: Einstellungen (Kammerton, Toleranzen, Lautstärken, gesprochener Einzähler aus), Erkennungs-Labor als versteckter Eintrag (Phase 1).

### Issues mit Label `idee` (werden nach Freigabe angelegt)
1. Kinder-Modus und Kinder-Schule (Farben, Spiele, Elternsperre) als eigene App
2. Import von Tab-Dateien (Guitar Pro, MusicXML, MIDI, Text-Tabs)
3. Tab-Editor für eigene Melodien
4. Mitspielmodus mit eigener Audioaufnahme und Zeitmarken
5. Mehrspurige Wiedergabe von Begleitspuren
6. Sprachbegleitung (Vorlesen, Ansagen, Coach-Tipps gesprochen)
7. Geschützte Songs und Kinder-Hits als Einträge mit Import-Weg
8. Kopfhörer-/Sperrbildschirm-Steuerung (Media Session)
9. Native iOS-App mit Capacitor
10. Spiel-mit-Modus Note für Note (ohne Bahn)

### Offene Fragen an den Besitzer
- Benchmark-Zielwerte bestätigen: Einzeltöne ≥ 95 % richtig, < 3 % Fehlalarme, Anschlag-Timing im Median < 30 ms, Akkorde ≥ 90 %.
- Vorläufiges „Vorhören“ unter Stücke bis Phase 3: ja (Vorschlag) oder konsequent entfernen?
- Alte Gitarrenschule (44 Lektionen) komplett entfernen (Vorschlag), die Texte dienen als Steinbruch für die Lernpfad-Lektionen in Phase 4.

## Phase 1 – Vorschau (noch nicht begonnen)
- `core/detection/`: Feature-Extraktion (Goertzel-Bänke für Zieltöne, Spektrum, YIN als Gegenprobe), Onset (Spectral Flux), Bewertung „Zielton anwesend?“, Kalibrierungsmodell.
- `core/audio/micWorklet.ts` + `public/worklets/analyser.js`: 48 kHz, Fenster 2048, Schritt 480 (10 ms), Ringpuffer, Nachrichten an den Main-Thread nur mit Ergebnissen.
- Kalibrierung beim ersten Start: 2 s Stille, Anschlag, Latenz zum Klick; gespeichert pro Gerät.
- Erkennungs-Labor unter Profil → Einstellungen (versteckt): Live-Pegel, Tonhöhe, Zuverlässigkeit, Anschläge; Clips aufnehmen, beschriften, als WAV + JSON exportieren; Aufnahmeliste und Anleitung „vom iPhone ins Repo“.
- Stimmgerät auf die neue Kette umstellen.

## Testen auf dem iPhone (Phase 0)
1. https://lifaadm.github.io/Gitarre-/ öffnen, Home-Bildschirm-App einmal löschen und neu hinzufügen (neue Datenbank).
2. Untere Navigation: vier Einträge, Profil oben rechts.
3. Start zeigt eine Hauptaktion. Stimmgerät und Metronom funktionieren wie bisher.
4. Stücke: Liste der gemeinfreien Arrangements, Vorhören spielt ab.
