# PLAN.md – GuitarCoach v2

Stand: 2026-10-19 · Aktuelle Phase: **0 – Plan & Aufräumen**, umgesetzt in PR #8 (Branch `v2/phase-0-plan-und-aufraeumen`). Nächste Phase nach dem Merge: **1 – Audio-Kette**.

Das Prinzip steht in `CLAUDE.md`: Spielen → App hört zu → sofortiges Feedback → Sterne → nächster Schritt.

## Phasenübersicht

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0 | Tag `v1-guitarcoach`, CLAUDE.md, PLAN.md, Altlasten entfernen, neues Navigationsgerüst | umgesetzt, PR #8 wartet auf Test und Merge |
| 1 | Neue Audio-Kette (AudioWorklet), Kalibrierung, Erkennungs-Labor, Stimmgerät umgestellt | offen |
| 2 | Erkennung an echten Aufnahmen abstimmen, Benchmark in der CI, Zielwerte erreichen | offen |
| 3 | Spielansicht mit Bewertung, Modi, Ergebnisbildschirm, Sterne | offen |
| 4 | Lernpfad Level 1–3 mit Inhalten, Startseite „Nächster Schritt“, Einstufungstest | offen |
| 5 | Akkorderkennung, Akkordbibliothek, Level 4–5 | offen |
| 6 | Stücke-Bibliothek, Erfahrungspunkte, Serie, Tagesziel, Wochen-Challenge, Statistik | offen |
| 7 | Feinschliff: Offline, Performance, Testcheckliste fürs iPhone | offen |

## Phase 0 – Plan & Aufräumen

### Erledigt
- Sicherung des alten Stands (`main` = b6820e0): Branch `v1-guitarcoach` auf GitHub angelegt. Der Tag `v1-guitarcoach` ist lokal gesetzt, lässt sich aus dieser Umgebung aber nicht pushen (der Git-Proxy trennt beim Tag-Push). Bitte einmalig auf GitHub anlegen: Releases → „Draft a new release“ → „Choose a tag“ → `v1-guitarcoach` eintippen → Target `v1-guitarcoach` (Branch) → „Publish release“. Wiederherstellen danach mit `git checkout v1-guitarcoach`.
- `CLAUDE.md` (Prinzip, Regeln, Zielarchitektur) und diese `PLAN.md`.

### Löschliste (freigegeben am 2026-10-19, umgesetzt)

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

### Issues mit Label `idee` (angelegt)
- #9 Kinder-Modus und Kinder-Schule als eigene App
- #10 Import von Tab-Dateien
- #11 Tab-Editor
- #12 Mitspielmodus mit eigener Audioaufnahme
- #13 Mehrspurige Wiedergabe
- #14 Sprachbegleitung
- #15 Geschützte Songs und Kinder-Hits
- #16 Kopfhörer-/Sperrbildschirm-Steuerung
- #17 Native iOS-App mit Capacitor
- #18 Spiel-mit-Modus Note für Note

### Entscheidungen (2026-10-19)
- Benchmark-Zielwerte bestätigt: Einzeltöne ≥ 95 % richtig, < 3 % Fehlalarme, Anschlag-Timing im Median < 30 ms, Akkorde ≥ 90 %.
- Vorläufiges „Vorhören“ unter Stücke bleibt bis Phase 3.
- Alte Gitarrenschule komplett entfernt; Texte über `v1-guitarcoach` als Steinbruch.

### Ergebnis Phase 0
- Entfernt: Kinder-Modus, Import, Editor, Mitspielmodus, Mehrspur, geschützte Songs, Spiel-mit, Griffbrett-Seite, alte Schule, Dashboard, Fortschritt, Lernziele, Backup, Sprachbegleitung (bis auf Einzähler), Media Session, STATUS/ROADMAP/ARCHITECTURE.
- Neu: Navigation Start · Lernpfad · Stücke · Werkzeuge · Profil, Dexie-Schema v2 (`guitarcoach-v2`), `core/detection/pitchMatch.ts` (Tonvergleich, Anschlag-Sperre), `features/play/` (Bahn-Engine, Bahn-Ansicht, Zeitleiste, Spurfarben) als Grundlage für Phase 3.
- Prüfungen: Typen, Lint, 157 Unit-Tests in 23 Dateien, Build, 9 E2E-Tests (davon 1 mit simuliertem Mikrofon).

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
