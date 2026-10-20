# PLAN.md – GuitarCoach v2

Stand: 2026-10-20 · Aktuelle Phase: **2 – Erkennung an echten Aufnahmen abstimmen**. Teil 1 (Benchmark-Gerüst, Schärfung an synthetischen Clips) liegt auf Branch `v2/phase-2-benchmark` (baut auf PR #19 auf). Teil 2 – Abstimmung an echten Aufnahmen – **wartet auf Aufnahmen vom iPhone** in `test-audio/real/`. PR #19 (Phase 1, enthält Phase 0) wartet auf Test und Merge.

Das Prinzip steht in `CLAUDE.md`: Spielen → App hört zu → sofortiges Feedback → Sterne → nächster Schritt.

## Phasenübersicht

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0 | Tag `v1-guitarcoach`, CLAUDE.md, PLAN.md, Altlasten entfernen, neues Navigationsgerüst | umgesetzt, PR #8 wartet auf Test und Merge |
| 1 | Neue Audio-Kette (AudioWorklet), Kalibrierung, Erkennungs-Labor, Stimmgerät umgestellt | umgesetzt, PR #19 wartet auf Test und Merge |
| 2 | Erkennung an echten Aufnahmen abstimmen, Benchmark in der CI, Zielwerte erreichen | Teil 1 umgesetzt (Benchmark in CI, synthetischer Satz erreicht Zielwerte); Teil 2 wartet auf echte Aufnahmen |
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

## Phase 1 – Audio-Kette (umgesetzt)

### Erkennungs-Kern `src/core/detection/` (reine Logik, läuft im Worklet, in Vitest und später im Node-Benchmark)
- `fft.ts` (reelle Radix-2-FFT, Hann-Fenster), `goertzel.ts` (Energie bei exakten Frequenzen, Rauschformel für Hann).
- `onset.ts`: Anschlagerkennung über Spectral Flux (60 Hz – 5 kHz, log-komprimiert, normiert), adaptive Schwelle (Median × 1,6, Mindestwert 3), Spitzenwahl mit einem Schritt Verzögerung, Mindestabstand 60 ms, Pegel-Gate.
- `presence.ts`: Zieltonprüfung „Ist der Ton da?“ – Teiltöne 1–5 per Goertzel auf 4096 Samples, jeder Teilton muss über Rauschen und Hintergrund liegen und näher am Ziel als am Nachbarhalbton; Oktavfehler „tiefer“ (0,5·f0 **und** 1,5·f0 vorhanden; nicht, wenn die untere Oktave selbst erwartet wird) und „höher“ (nur gerade Teiltöne). Schwelle `PRESENCE_THRESHOLD = 0,5` – wird in Phase 2 an echten Aufnahmen justiert.
- `engine.ts`: `AnalysisEngine` – Schritt 10 ms, FFT 2048, Zieltonfenster 4096, YIN (70–1200 Hz) als Gegenprobe, Mindestpegel = max(0,0015, 3 × Grundrauschen). Liefert je Schritt ein `AnalysisFrame` (Zeit, RMS, Spitze, Tonhöhe, Flux, Anschlag, Zieltöne).
- `calibration.ts` + `calibrationSession.ts`: Grundrauschen (90. Perzentil), Anschlagpegel, empfohlener Mindestpegel, Latenz (Median der Klick→Anschlag-Abstände, zuverlässig ab 3 Treffern und Streuung < 60 ms); Ablauf als Zustandsautomat.
- `testSignals.ts`: synthetische Nylon-Zupftöne, Akkorde, Rauschen für Tests.

### Mikrofon-Kette
- `src/core/audio/worklet/analyser.worklet.ts` wird von Vite als eigene Datei gebündelt (`?worker&url`, 9 kB) und per `audioWorklet.addModule` geladen; rechnet im Audio-Thread, schickt nur Ergebnisse. Rohaudio nur während einer Aufnahme.
- `src/core/audio/micWorklet.ts` (`MicAnalyser`), `mic.ts` (Stream mit echoCancellation/noiseSuppression/autoGainControl **aus**, Fehlertexte).
- `src/hooks/useDetection.ts` ersetzt `usePitchDetection`: Tonhöhe (PitchTracker), Pegel, Anschläge, Zieltöne, `onFrame`/`onAudio`, Mindestpegel aus Kalibrierung × Empfindlichkeit.
- Stimmgerät läuft auf der neuen Kette; Oberfläche unverändert.

### Kalibrierung (`/kalibrierung`)
- Drei Schritte mit je einer Hauptaktion: 2 s Stille → einmal über alle Saiten → 8 Töne zum Klick (80 BPM). Jeder Schritt lässt sich überspringen.
- Ergebnis je Gerät in Dexie v2 (Tabelle `calibration`, Schlüssel Plattform|Browser|App/Tab|Abtastrate). Start zeigt ohne Kalibrierung „Mikrofon einrichten“ als Hauptaktion; Profil → Stimmgerät & Mikrofon zeigt die Werte und „Wiederholen“.

### Erkennungs-Labor (`/profil/labor`, Karte unter Profil)
- Live: Pegel (dBFS, Mindestpegel), Tonhöhe mit Cent, YIN-Zuverlässigkeit, Anschlagzähler, Zieltonprüfung je erwarteter Note der gewählten Vorgabe.
- Aufnahmen: Vorgaben (6 Leersaiten, Tonleiter C-Dur, wiederholter Ton, Akkorde a-Moll/E/e-Moll/C/G/D, Etüde, Stille, frei), Notiz, bis 30 s; gespeichert in Dexie (Tabelle `clips`), abspielbar, löschbar, Export als WAV + JSON über den iOS-Teilen-Dialog (sonst Download).
- Anleitung „Vom iPhone ins Repository“ in der App und in `test-audio/real/README.md` (GitHub-Upload direkt aus Safari nach `test-audio/real/`).

### Entscheidungen (2026-10-19)
- Worklet als TypeScript im Quellbaum statt `public/worklets/analyser.js`, damit der Analyse-Kern genau einmal existiert (Worklet, Tests, Benchmark).
- Zieltonfenster 4096 Samples (85 ms) wegen der tiefen E-Saite; Anschläge und Tonhöhe auf 2048 (43 ms).
- Alle Schwellen sind Startwerte; Phase 2 stellt sie anhand echter Aufnahmen ein und sichert sie im Benchmark.

### Ergebnis Phase 1
- Prüfungen: Typen, Lint, 184 Unit-Tests in 29 Dateien, Build, 11 E2E-Tests (3 mit simuliertem Mikrofon: Stimmgerät, Kalibrierung, Labor).
- Offen: echte Aufnahmen vom iPhone; Verhalten auf iOS Safari (Worklet-Start, Hintergrund, Anruf) am Gerät prüfen.

## Testen auf dem iPhone (Phase 1, PR #19)
1. Nach dem Merge https://lifaadm.github.io/Gitarre-/ öffnen (ggf. App neu laden, Schema v2 wird automatisch erweitert).
2. Start zeigt „Mikrofon einrichten“ → Jetzt einrichten → Mikrofon erlauben → zwei Sekunden still → über alle Saiten → acht Töne zum Klick. Ergebnis: Rauschen (ruhiger Raum etwa −60 bis −50 dB), Anschlag (etwa −20 bis −6 dB), Verzögerung (etwa 60–150 ms). Speichern → Start zeigt „Gitarre stimmen“.
3. Stimmgerät: alle sechs Saiten, Referenzton, Pegelanzeige. Mikrofon stoppen, App in den Hintergrund, zurück – kein Absturz, Mikrofon-Anzeige weg.
4. Profil → Erkennungs-Labor → Mikrofon starten. Leere A-Saite: Tonhöhe A2, Zuverlässigkeit > 80 %, Anschlagzähler zählt jeden Anschlag genau einmal, Balken „A2“ der Zieltonprüfung grün. Vorgabe „Akkord a-Moll“ wählen, Akkord schlagen: alle fünf Balken grün.
5. Aufnahmen: jede Leersaite dreimal, wiederholter Ton, Tonleiter, die Akkorde, zehn Sekunden Stille. Je Aufnahme Teilen → „In Dateien sichern“; danach in Safari über den Link in der Anleitung nach `test-audio/real/` hochladen. Das ist die Grundlage für Phase 2.

## Phase 2 – Erkennung an echten Aufnahmen (Teil 1 umgesetzt)

### Benchmark `npm run bench:detection`
- Läuft in Node über den Vitest-Runner (`vitest.bench.config.ts`, `bench/detection.bench.ts`): liest `test-audio/real/*.wav` + `*.json` (Format aus dem Erkennungs-Labor) und den deterministischen synthetischen Satz (`src/core/detection/benchmarkSynthetic.ts`, 45 Clips in drei Varianten: normal, leise, lauter Raum).
- Kern `src/core/detection/benchmark.ts` (reine Logik, getestet): Ereignisse = Anschläge der Engine; je Ereignis Zieltonprüfung (75. Perzentil im Fenster 40–250 ms, Akkorde 80–400 ms) und Tonhöhe (Median) als Gegenprobe. **Treffer**: erwarteter Ton anwesend und Tonhöhe widerspricht nicht. **Fehlalarm**: ein Köderton (±1, ±2 Halbtöne, ±Oktave; nicht erwartet) gilt als anwesend; bei Stille jedes Ereignis. **Timing**: Abstand zu Referenz-Anschlägen aus der Offline-Hüllkurve des ganzen Clips.
- Zielwerte (`BENCHMARK_TARGETS`): Einzeltöne ≥ 95 %, Fehlalarme < 3 %, Timing-Median < 30 ms, Akkordtöne ≥ 90 %. Der Lauf schlägt fehl, wenn ein vorhandener Satz sie unterschreitet; die CI führt ihn nach den Unit-Tests aus und lädt `bench-results/` (Markdown + JSON) als Artefakt hoch. Ohne echte Aufnahmen warnt der Lauf deutlich – **die Zielwerte gelten erst mit echten Aufnahmen als erreicht.**

### Schärfungen an der Erkennung (aus dem synthetischen Satz)
- Zieltonprüfung: Teiltöne müssen spektrale Gipfel sein (E_k ≥ Nachbarhalbton). Oktave darunter **und** Duodezime darunter (f0/2, f0/3) werden erkannt, wenn deren Grundton selbst ein Gipfel ist, mindestens halb so stark wie die Energie bei f0, und ein weiterer Teilton da ist. Oktave darüber: Grundton fehlt, 2·f0 trifft (und 3·f0 fehlt oder Grundton < 1/10 des 2. Teiltons). Erwartete tiefere Töne (A2 und A3 im Akkord) sind ausgenommen, Ködertöne nicht (`AnalysisEngine.setTargets(erwartet, köder)`).
- Lautstärke: Die Zielton-Energie muss ≥ 0,5 % der Fensterleistung tragen (≈ −23 dB), sonst gilt sie als Nachklang.
- Anschläge: Schwelle Median × 2 mit Sockel 5; `onsetTime` um die Analyseverzögerung (20 ms) korrigiert.
- Ergebnis synthetischer Satz: Einzeltöne 100 %, Akkordtöne 100 %, Fehlalarme 0,5 %, Timing-Median 4 ms. Bekannte Reste: Tonleiter-Clips 4 Köder-Treffer je 168 Prüfungen (Nachklang überlappender Töne), a-Moll-Akkord meldet im normalen Pegel einen zweiten Anschlag ≈ 0,5 s nach dem Strum.

### Teil 2 – wartet auf Aufnahmen
- Sobald Aufnahmen in `test-audio/real/` liegen (Upload direkt aus Safari, Anleitung im Labor und in `test-audio/real/README.md`), laufen sie automatisch im Benchmark mit. Dann: Schwellen (`PRESENCE_THRESHOLD`, `MIN_SALIENCE`, Flux-Sockel, Gate), Oktavregeln, Fensterlängen und ggf. die Gewichte der Teiltöne für Nylonsaiten und das iPhone-Mikrofon einstellen, bis alle vier Zielwerte auf dem echten Satz stehen.
- Mindestumfang für aussagekräftige Werte: jede Leersaite dreimal (6 Clips), wiederholter Ton, Tonleiter, sechs Akkorde, Stille – plus Varianten leise/laut/weiter weg.

## Testen auf dem iPhone (Phase 2, Teil 1)
1. Nichts Neues in der App – Phase 2 Teil 1 ändert nur die Erkennung und den Benchmark. Die Punkte aus Phase 1 gelten weiter (Kalibrierung, Stimmgerät, Labor).
2. Aufnahmen aus dem Labor nach `test-audio/real/` hochladen (siehe Anleitung). Die CI führt den Benchmark auf dem Branch aus; das Ergebnis steht im Workflow-Lauf unter „Artifacts → bench-results“ (`detection.md`).

## Testen auf dem iPhone (Phase 0, erledigt mit PR #8)
1. https://lifaadm.github.io/Gitarre-/ öffnen, Home-Bildschirm-App einmal löschen und neu hinzufügen (neue Datenbank).
2. Untere Navigation: vier Einträge, Profil oben rechts.
3. Start zeigt eine Hauptaktion. Stimmgerät und Metronom funktionieren wie bisher.
4. Stücke: Liste der gemeinfreien Arrangements, Vorhören spielt ab.
