# GuitarCoach – Architektur und technische Entscheidungen

## Überblick

GuitarCoach ist eine reine Client-Anwendung (PWA) ohne Backend. Alle Daten liegen in IndexedDB auf dem Gerät; Audio wird lokal erzeugt und analysiert.

```
src/
  app/            App-Shell, Router, Bootstrap, Navigation
  components/ui/  Wiederverwendbare UI-Bausteine (Button, Card, Sheet, Slider, Toast, Markdown …)
  core/           Geschäftslogik ohne React-Abhängigkeit (vollständig unit-getestet)
    music/        Notennamen, Frequenzen, Stimmung, Griffbrett, Dauern, Datenmodell, Tab-Notation, Abspielplan
    audio/        AudioContext-Verwaltung, Karplus-Strong-Synth, Metronom, Tab-Player, Mikrofon, YIN-Tonerkennung
    import/       Formaterkennung, alphaTab-Konverter (GP/MusicXML/alphaTex), MIDI-Parser, GuitarCoach-JSON
    storage/      Dexie-Schema, Repositories, Einstellungen, Datensicherung
    content/      Eingebaute Songs (Arrangements), Übungen, Lektionen, Lernziele, Seeding
    progress/     Statistiken, Empfehlungen, Erfolge (regelbasiert)
    speech/       Sprachbegleitung: Textbausteine (reine Funktionen, getestet) und Web-Speech-Kapselung
    coach/        Coach-Tipps: regelbasierte Hinweise aus Messwerten (ListenCoach, TunerCoach, Player-/Tagestipps)
  features/       Seiten und Feature-Komponenten (Dashboard, Tuner, Griffbrett, Metronom, Songs, Player, Lektionen, Üben, Spiel mit, Editor, Fortschritt, Einstellungen)
  hooks/          React-Hooks (Settings, Engine, Übungssitzungen, Pitch-Detection, Sprache, Live-Daten)
```

## Wichtige Entscheidungen

### 1. Eigenes Datenmodell statt alphaTab-Modell im Kern
`Score → Track → Bar → Beat → Note` mit Ticks (960 pro Viertel, wie alphaTab). Saite 1 = hohe E (Gitarristen-Konvention). Vorteile: kleine, typsichere Struktur, in IndexedDB serialisierbar, unabhängig von der Importbibliothek; eingebaute Lieder und importierte Dateien laufen durch denselben Player.

### 2. alphaTab als Importer und für die Partituransicht
alphaTab (MPL-2.0) parst Guitar Pro 3–8, MusicXML und alphaTex zuverlässig. Wir nutzen `ScoreLoader` im Hauptthread und konvertieren in unser Modell (`convertAlphaTabScore`). Die Abspielreihenfolge mit Wiederholungen/Sprüngen übernehmen wir aus alphaTabs `MidiFileGenerator.tickLookup`, damit sie exakt der Referenz entspricht. alphaTab wird per `import()` erst bei Bedarf geladen (1,2 MB-Chunk, offline vorgecacht). Die optionale „Noten + Tab“-Ansicht (`ScoreView`) nutzt den alphaTab-Renderer im Hauptthread (`useWorkers: false`, SVG, Bravura-Font aus `/font/`); eigene Scores werden dafür per `exportAlphaTex` nach alphaTex übersetzt (Rundreise ist getestet). Player, Worker/Worklet und SoundFont von alphaTab werden nicht genutzt.

### 3. Eigener Tab-Renderer (SVG)
`tabLayout.ts` berechnet reine Layout-Daten (Beat-Breiten logarithmisch zur Dauer, Umbruch in Systeme, Streckung auf Containerbreite); `TabView.tsx` zeichnet SVG pro System: Linien, Bundzahlen, Rhythmushälse mit Balken/Fähnchen, Pausen, Bindungen, Techniken (H/P/Slide/Vibrato/P.M.), Fingersatz, Text, Schleifenbereich, aktuelle Note/Takt. Die Abspielmarke wird imperativ (ohne React-Rerender) bewegt. Wiederholungen werden entrollt dargestellt – für Anfänger linear lesbar.

### 4. Eigene Klangerzeugung (Karplus-Strong)
`pluckSynthesis.ts` rendert gezupfte Nylonsaiten per erweitertem Karplus-Strong (fraktionale Verzögerung für exakte Tonhöhe, Anschlagpositions-Kammfilter, frequenzabhängige Ausklingzeit) in AudioBuffer-Puffer (gecacht). Die Klangkette (Tiefpass, Körperresonanz, Kompressor) läuft in Web Audio. Kein SoundFont nötig, keine Lizenzfragen, kleine Downloads. Referenztöne des Stimmgeräts sind reine Sinustöne (exakte Frequenz).

### 5. Audio-Scheduling mit Lookahead
Metronom und Tab-Player planen Ereignisse ~250 ms im Voraus auf der AudioContext-Uhr; der JS-Timer dient nur als Taktgeber. Der `TabPlayer` ist von Web Audio entkoppelt (`PlayerClock`/`PlayerSink`) und daher mit virtueller Uhr testbar (Tempo, Schleife, Einzähler, Einzelton). Positionsanzeige über `requestAnimationFrame` mit Ausgabelatenz-Korrektur.

### 6. Tonerkennung: YIN + Stabilisierung
`AnalyserNode` (4096 Samples) wird alle 40 ms ausgelesen; `detectPitchYin` liefert Grundfrequenz und Wahrscheinlichkeit; `PitchTracker` gated nach Pegel, bildet den Median der letzten Werte und meldet „stabil“ erst nach einer Mindestdauer. Keine AudioWorklets – der Polling-Ansatz ist auf iOS robust und ausreichend schnell. Die App zeigt nur stabile Messwerte; sonst „–“.

### 7. Spiel-mit-Modus
`listenLogic.ts` vergleicht erkannte Tonhöhe mit erwarteten Noten (Treffer/zu tief/zu hoch/Oktave/falsch) und erkennt per `OnsetGate` neue Anschläge, damit ein gehaltener Ton nicht die nächste gleiche Note „mitnimmt“. Während Referenztöne spielen, pausiert die Analyse, damit die App nicht ihre eigene Ausgabe bewertet.

### 8. Speicherung
Dexie (IndexedDB) mit Tabellen `songs`, `songVersions`, `importFiles`, `practiceSessions`, `lessonProgress`, `songProgress`, `settings`, `achievements`, `goals`, `meta`. Eingebaute Inhalte werden per `seedDatabase()` idempotent angelegt (`CONTENT_VERSION` steuert Aktualisierungen, Nutzerdaten bleiben erhalten). Schemaänderungen laufen über Dexie-Versionen. Backup/Restore als JSON.

### 9. Statistiken ohne Erfindung
Alle Zahlen stammen aus `practiceSessions` (gemessene Zeit je Seite/Modus) und gespeicherten Ergebnissen. Empfehlungen sind regelbasiert (`recommendations.ts`), Erfolge werden aus den Daten abgeleitet und mit Zeitstempel gespeichert.

### 10. Weitere Importe und Mitspielmodus
`textTabImport.ts` liest ASCII-Text-Tabs (6 Zeilen, Bundzahlen, Techniken h/p/~/slide) und schätzt Notenlängen aus den Zeichenabständen (häufigster Abstand = gewählte Grundlänge, Vielfache = längere Noten); das Ergebnis wird deutlich als Schätzung markiert. `playalong/syncMap.ts` bildet Audiozeit und Planzeit über manuell gesetzte Zeitmarken stückweise linear aufeinander ab; die Audiodatei spielt ein `<audio>`-Element (Blob-URL aus IndexedDB), die Tab-Ansicht folgt per `requestAnimationFrame`.

### 11. Mehrspurige Wiedergabe
`buildMixPlan` hängt die Notenereignisse von Begleitspuren (mit Lautstärkefaktor) an den Plan der Hauptspur; Beats, Metronom und Einzelton-Modus bleiben an der Hauptspur. Der Synth dämpft Saiten pro Kanal (Spur), damit Begleitspuren nicht die Hauptstimme abwürgen.

### 12. Bereitstellung und Tests mit Mikrofon-Simulation
Der Basis-Pfad ist über `GUITARCOACH_BASE` konfigurierbar (GitHub Pages unter `/<repo>/`); Router, Manifest, Service Worker, Font- und Beispielpfade nutzen `import.meta.env.BASE_URL`. Playwright-Projekte speisen über `--use-file-for-fake-audio-capture` synthetische Gitarrentöne (eigene WAV-Fixtures) in die echte Analysekette ein.

### 13. Automatische Vereinfachung
`simplifyScore` erzeugt aus einer Spur eine monophone Übungsstimme (höchster Ton je Schlag), entfernt Spieltechniken, fasst 16tel zu 8teln zusammen und verlegt Töne in eine tiefere Lage, wenn möglich. Das Ergebnis wird als eigene Version mit `kind: 'simplified'` gespeichert und in der Oberfläche als Vereinfachung gekennzeichnet – nie als Original ausgegeben.

### 14. Rechte
Nur gemeinfreie Lieder (eigene Arrangements) und eigene Übungen sind enthalten. Geschützte Songs existieren als Bibliothekseinträge mit Status „Tab-Datei nötig“ plus eigenen Vorübungen; Noten kommen ausschließlich per Nutzer-Import.

### Sprachbegleitung (Web Speech API)
- `core/speech/phrases.ts` enthält ausschließlich reine Funktionen: Markdown → Sprechtext (Abkürzungen, Saitenfolgen, Sonderzeichen ausgeschrieben), aussprechbare Notennamen („Fis“, „Es“), Ordnungszahlen mit Genus („sechste Saite“, „dritter Bund“), Zählworte, sowie `TunerAnnouncer`, der entscheidet, wann das Stimmgerät spricht (Zustand ≥ 500 ms stabil, Mindestabstand 1,5 s, dieselbe Ansage erst nach einer Pause von 500 ms = neuer Anschlag).
- `core/speech/speech.ts` kapselt `speechSynthesis`: Texte werden in Abschnitte ≤ 220 Zeichen zerlegt (Chrome bricht lange Äußerungen ab), die beste deutsche Stimme wird bewertet (de-DE, lokal, „Enhanced/Premium“, bekannte Namen), fehlende `onend`-Ereignisse werden durch Sicherheits-Timer abgefangen, und `primeSpeech()` schaltet iOS mit der ersten Berührung frei.
- Mikrofon-Kopplung: `usePitchDetection` fragt `isSpeechBlockingMic()` ab und verwirft Analysen, solange gesprochen wird (plus 350 ms Nachlauf). So kann die App im Stimmgerät und im Spiel-mit-Modus sprechen, ohne sich selbst zu „hören“.
- Einzähler: `TabPlayer.onCountIn` meldet Anzahl, Abstand und Audio-Zeit des ersten Klicks; der `SongPlayer` plant die Zählworte per Timer mit kleinem Vorlauf. Sprachausgabe lässt sich nicht an die Audio-Uhr binden, daher bleibt eine Schwankung von einigen zehn Millisekunden.
- Einstellungen: Hauptschalter, Tempo, Stimme und ein Schalter je Bereich; `sayNow(scope, text)` liest die Einstellungen beim Aufruf und ist damit referenzstabil für Effekte.
- Kopfhörer-Steuerung: `core/audio/mediaSession.ts` registriert Media-Session-Handler und spielt dafür eine zur Laufzeit erzeugte stumme WAV-Schleife (iOS zeigt Medien-Steuerung nur für `<audio>`-Elemente). Experimentell, standardmäßig aus.

### Coach-Tipps
- `core/coach/coach.ts` ist reine Logik ohne React: `ListenCoach.observe()` erhält jede Bewertung des Spiel-mit-Modus samt erwarteter Griffposition und leitet aus der Fehlerhistorie Muster ab (±70 Cent und mehr = ein Bund daneben; Quart/Terz-Abstand = Nachbarsaite; Oktave; Intonation zu tief/hoch auf gegriffenen Tönen; verstimmte Leersaiten; drei Fehler in Folge). `TunerCoach.update()` verfolgt Richtungswechsel je Saite (Überdrehen), zuletzt gestimmte Saiten (Zurückrutschen) und Dauer großer Abweichungen. `TipGate` drosselt (Mindestabstand, jede ID einmal, Lob wiederholbar).
- Tipps sind Daten (`CoachTip { id, text, spoken?, kind }`); `CoachTipCard` zeigt sie einheitlich mit Vorlesen und Schließen. Sprachausgabe läuft über den Bereich `tips` der Sprachbegleitung und unterbricht laufende Ansagen nicht (`interrupt: false`).
- Der Tipp des Tages ist deterministisch (Kalendertag modulo Liste), datengetriebene Hinweise aus `Summary` haben Vorrang.

## Erweiterbarkeit
- Neue eingebaute Songs/Übungen: `core/content/songs.ts` bzw. `exercises.ts` (Tab-Notation), `CONTENT_VERSION` erhöhen.
- Neue Lektionen: `core/content/lessons/`.
- Weitere Importformate: `core/import/` (Konverter → `Score`).
- Capacitor: Die App ist reines Web (keine Node-Abhängigkeit zur Laufzeit); für iOS-Native sind Mikrofon-Berechtigungen und `AudioContext`-Verhalten identisch zur Safari-WebView.
