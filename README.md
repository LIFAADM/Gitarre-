# GuitarCoach v2

Deutschsprachige Lern-App für die klassische Konzertgitarre als PWA fürs iPhone. Neuaufbau nach einem Prinzip: **Spielen → App hört zu → sofortiges Feedback → Sterne → nächster Schritt.** Regeln und Zielbild stehen in `CLAUDE.md`, der Stand der Arbeit in `PLAN.md`.

Live: https://lifaadm.github.io/Gitarre-/ · Alte Version: Branch bzw. Tag `v1-guitarcoach`.

## Stand (Phase 2, Teil 1)

- Navigation: Start · Lernpfad · Stücke · Werkzeuge, Profil oben rechts.
- Tonerkennung im AudioWorklet (10-ms-Schritte): Tonhöhe, Anschläge, Zieltonprüfung „Ist der Ton da?“; Kalibrierung je Gerät (Rauschen, Pegel, Latenz) beim ersten Start.
- Funktioniert: Stimmgerät auf der neuen Kette, Metronom, Vorhören der sechs gemeinfreien Arrangements, Erkennungs-Labor mit beschrifteten Aufnahmen (Export WAV + JSON nach `test-audio/real/`).
- Benchmark `npm run bench:detection` (läuft in der CI): echte Aufnahmen aus `test-audio/real/` plus synthetischer Satz; Zielwerte Einzeltöne ≥ 95 %, Fehlalarme < 3 %, Timing < 30 ms, Akkorde ≥ 90 %. Echte Aufnahmen fehlen noch.
- Kommt in den nächsten Phasen: Abstimmung an echten Aufnahmen, die Spielansicht mit Bewertung, Lernpfad, Akkorde, Stücke-Bibliothek, Fortschritt.

## Entwicklung

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # Typen, Lint, Tests
npm run bench:detection   # Erkennungs-Benchmark (test-audio/real + synthetisch), Bericht in bench-results/
npm run build && npm run preview
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e   # Playwright, iPhone-Viewport, Fake-Mikrofon
```

Technik: React 19, TypeScript strict, Vite, Tailwind 4, Dexie (IndexedDB, Schema v2), alphaTab + Bravura, Web Audio (eigener Nylonsynth), Playwright, GitHub Actions mit Pages-Deployment aus `main`.

Kein Konto, keine Werbung, kein Tracking, keine Cloud. Mikrofon-Audio verlässt nie das Gerät. Nur gemeinfreie Stücke und eigene Übungen.
