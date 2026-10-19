# GuitarCoach v2 – Arbeitsregeln für dieses Repository

Lies zu Beginn jeder Sitzung diese Datei und `PLAN.md`. Aktualisiere `PLAN.md` am Ende jeder Sitzung.

## Das Prinzip (gilt für jede Entscheidung)

**Spielen → App hört zu → sofortiges Feedback → Sterne → nächster Schritt geht auf.**

- Es gibt genau **eine Spielansicht**, über die alles läuft: Lektionen, Übungen, Stücke.
- Die Startseite zeigt groß den **nächsten Schritt**. Ein Tippen, und es wird gespielt.
- Jeder Bildschirm hat genau **eine Hauptaktion**.
- Erklärungen höchstens **drei Sätze**, dann wird gespielt. Kein Lesen ohne Spielen.
- Was dem Prinzip nicht dient, wird nicht programmiert, sondern als GitHub-Issue mit Label `idee` geparkt.
- Eigenes Design. Keine Marken, Grafiken oder Texte von Yousician oder anderen Apps.

## Instrument und Inhalt

- Klassische Konzertgitarre, Nylonsaiten, Standardstimmung E–A–D–G–H–E (deutsche Notennamen, „H“).
- Nylon: weicher, obertonärmerer Klang, kürzeres Sustain. Neue Saiten verstimmen sich schnell → Stimm-Hinweis vor jeder Übungseinheit.
- Klassische Technik: rechte Hand p-i-m-a, linke Hand 1–4, Tirando/Apoyando, Arpeggien, Ligados, Barré, Lagenspiel, Rasgueado.
- Notation: Tabulatur **und** Standardnotation (oktavierender Violinschlüssel) mit Fingersatz.
- Nur gemeinfreie Stücke (Carulli, Carcassi, Sor, Giuliani, Aguado, Tárrega, Romance anonyme, Volkslieder) oder eigene Übungen. Keine geschützten Werke, keine fremden Tabs.
- Inhalte liegen als Datendateien (JSON + alphaTex mit Fingersätzen) unter `content/`, nicht im Code. Tests prüfen, dass jede Note spielbar ist und einen Fingersatz hat.

## Tonerkennung hat Vorrang

Erst wenn die Erkennung mit echter Gitarre zuverlässig ist, wird darauf aufgebaut.

- AudioWorklet, lückenlose Analyse in festen Schritten (~10 ms), Rechnen im Worklet/Worker, nicht im Main-Thread.
- `echoCancellation`, `noiseSuppression`, `autoGainControl` bleiben **aus**.
- Erwartungsgeführt: Die Spielansicht weiß, welcher Ton kommt. Geprüft wird „Ist der Zielton da?“ (Energie an Grundton und Obertönen, Tonhöhenschätzung als Gegenprobe), bei Akkorden jeder Akkordton.
- Anschlagerkennung (Spectral Flux) für Timing und wiederholte gleiche Töne.
- Gezielt behandeln: Oktavfehler, tiefe E-Saite (82 Hz), Nachklang vorheriger Töne.
- Kalibrierung pro Gerät: Grundrauschen, Eingangspegel, Latenz.
- Benchmark `npm run bench:detection` gegen echte Aufnahmen in `test-audio/real/`; läuft in der CI und schlägt bei Unterschreitung der Zielwerte fehl.
- Mikrofon-Audio verlässt nie das Gerät. Keine Server, kein Tracking, kein Konto.

## Architektur (Zielbild)

```
src/
  app/            Shell, Router, Navigation: Start · Lernpfad · Stücke · Werkzeuge · Profil
  components/ui/  UI-Bausteine (Button, Card, Sheet, Slider, Segmented, Toast …)
  core/
    music/        Notennamen, Frequenzen, Stimmung, Griffbrett, Dauern, Datenmodell, Abspielplan
    audio/        AudioContext, Karplus-Strong-Nylonsynth, Metronom-Scheduler, Mikrofon-Kette (Worklet)
    detection/    Tonerkennung: Features (Goertzel/Spektrum, Pitch, Onset), Bewertung, Kalibrierung, Benchmark-Kern (auch in Node lauffähig)
    notation/     alphaTab-Anbindung (alphaTex → Modell, Rendering Noten + Tab)
    content/      Laden und Validieren der Datendateien (Lernpfad, Stücke, Akkorde)
    progress/     Sterne, Freischaltung, Erfahrungspunkte, Serie, Tagesziel, Statistik
    coach/        Coach-Tipps (nur Ergebnisbildschirm)
    storage/      Dexie-Schema v2, Einstellungen, Kalibrierung
  features/
    play/         DIE Spielansicht: Bahn, Noten+Tab, Bewertung, Modi, Ergebnis
    home/         Start: nächster Schritt, Heute üben
    path/         Lernpfad: Levels, Knoten, Freischaltung, Einstufung
    pieces/       Stücke-Bibliothek
    tools/        Stimmgerät, Metronom, Akkordbibliothek
    profile/      Fortschritt, Einstellungen, Erkennungs-Labor (versteckt)
content/          Datendateien: Lernpfad, Stücke (alphaTex + JSON), Akkorde
test-audio/real/  Echte Aufnahmen (WAV + JSON-Beschriftung) für den Benchmark
```

Regeln für Code:
- TypeScript strict, keine `any`. Reine Logik in `core/` ohne React, vollständig getestet (Vitest).
- Eine Spielansicht (`features/play`); keine zweite Variante, kein Sonderfall je Inhaltstyp.
- Deutsch in Oberfläche, Kommentaren, Commits, PRs. Code-Bezeichner Englisch.
- Lint (`npm run lint`), Typen (`npm run typecheck`), Tests (`npm test`), Build und E2E (`npm run e2e`) müssen vor jedem Push grün sein.

## Arbeitsweise mit GitHub

- **Eine Phase = ein Branch = ein Pull Request nach `main`.** Branch-Name `v2/phase-N-kurzname`.
- PR-Beschreibung auf Deutsch: was sich geändert hat, wie es auf dem iPhone getestet wird, was offen ist.
- Die CI muss grün sein. **Claude mergt nicht selbst** – der Besitzer testet und mergt.
- Kleine Commits mit deutschen Commit-Messages.
- Alles außerhalb der aktuellen Phase wird ein Issue mit Label `idee`, kein Code.
- `PLAN.md` ist die einzige Status- und Planungsdatei (ersetzt STATUS.md, ROADMAP.md, ARCHITECTURE.md). README kurz und aktuell.
- Die alte App ist als Tag `v1-guitarcoach` jederzeit wiederherstellbar.

## Bereitstellung

- GitHub Pages aus `main` (Workflow `deploy-pages.yml`), Adresse https://lifaadm.github.io/Gitarre-/.
- Basis-Pfad über `GUITARCOACH_BASE`; Vorschau lokal mit `npm run build && npm run preview`.
- Playwright nutzt den vorinstallierten Chromium (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`) und simuliert das Mikrofon mit WAV-Dateien.
