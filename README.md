# GuitarCoach – meine persönliche Gitarren-Lernapp

GuitarCoach ist eine deutschsprachige Progressive Web App (PWA) zum Gitarrelernen auf der klassischen Konzertgitarre – gedacht für absolute Anfänger, optimiert für das iPhone, komplett offline, ohne Konto, Werbung oder Cloud.

**Kernfunktionen**

- 🎸 **Stimmgerät** mit dem iPhone-Mikrofon (YIN-Tonerkennung, Cent-Anzeige, Nadel, Saitenerkennung, Referenztöne)
- 🎼 **Interaktiver Tab-Player** mit echter Klangwiedergabe (eigener Nylonsaiten-Synthesizer), Tempo 25–150 %, Abschnittsschleife, Einzeltonmodus, Metronom mit Einzähler, Griffbrett-Anzeige der aktuellen Note
- 📚 **Gitarrenschule** mit 7 Kapiteln und 42 Lektionen (Erklärung, Übung, Hörbeispiel, Griffbrett, Selbstkontrolle, Speicherung)
- 🎵 **Songbibliothek** mit allen Wunsch-Songs: sechs gemeinfreie Lieder sofort spielbar (eigene Arrangements in mehreren Lernversionen), geschützte Songs mit Importstatus und eigenen Vorübungen
- 📥 **Import** von Guitar Pro 3–8, MusicXML, alphaTex, MIDI und GuitarCoach-JSON – lokal verarbeitet, offline nutzbar
- 👂 **„Spiel mit – GuitarCoach hört zu“**: Mikrofon-Lernkontrolle Note für Note (grün/gelb/rot, Toleranz einstellbar)
- ✍️ **Tab-Editor** für eigene Melodien (Griffbrett-Eingabe, Notenlängen, Pausen, Export)
- 📈 **Dashboard, Lernplan, Statistiken, Lernziele, Erfolge** – alles aus echten Übungsdaten
- 🔒 Daten bleiben auf dem Gerät (IndexedDB), Sicherung/Wiederherstellung als JSON

## Technologiestack

| Bereich | Technik |
| --- | --- |
| UI | React 19, TypeScript (strict), Vite 8, Tailwind CSS 4, Lucide Icons, React Router 7 |
| Audio | Web Audio API, eigener Karplus-Strong-Gitarrensynth, Lookahead-Scheduler, AnalyserNode + YIN |
| Import | alphaTab 1.8 (Guitar Pro, MusicXML, alphaTex), eigener MIDI-Parser, eigenes JSON-Format |
| Speicher | IndexedDB via Dexie 4 (LocalStorage nur für Kleinstwerte) |
| Offline | vite-plugin-pwa / Workbox (Precache aller App-Dateien inkl. Beispieldateien) |
| Tests | Vitest + Testing Library (149 Unit-/Komponententests), Playwright (12 End-to-End-Smoke-Tests) |

## Installation und Start

Voraussetzung: Node.js ≥ 20 (getestet mit 22) und npm.

```bash
npm install
npm run dev          # Entwicklungsserver (http://localhost:5173, im LAN per --host erreichbar)
```

Für Mikrofonzugriff vom iPhone im lokalen Netz wird **HTTPS** benötigt (Browser-Vorgabe). Optionen: `vite --host` hinter einem Reverse-Proxy mit Zertifikat, ein Tunnel (z. B. Cloudflare Tunnel, ngrok) oder ein Deployment auf einem HTTPS-Host (GitHub Pages, Netlify, Vercel, eigener Server). Auf dem Entwicklungsrechner selbst reicht `localhost`.

## Produktions-Build

```bash
npm run build        # erzeugt dist/ inkl. Service Worker und Manifest
npm run preview      # lokaler Server für den Build (http://127.0.0.1:4173)
```

`dist/` ist statisch und kann auf jedem HTTPS-Webspace liegen. Der Service Worker cached die App nach dem ersten Laden vollständig (ca. 2 MB), danach läuft sie offline.

## Tests

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint (inkl. React-Hooks-Regeln)
npm test             # Vitest (Unit/Komponenten)
npm run build        # Produktions-Build
PW_CHROMIUM_PATH=/pfad/zu/chromium npm run e2e   # Playwright-Smoke-Tests gegen den Build (ohne Variable nutzt Playwright seinen eigenen Chromium)
npm run check        # typecheck + lint + test + build
```

Getestete Bereiche: Frequenz↔Note und Cent, Stimmung/Saitenerkennung, Bund-/Saitenpositionen, Notendauern und Timing, Tab-Notation, Abspielplan (Wiederholungen, Tempo), Player-Timing (50 %, Schleife, Einzähler, Einzelton), Karplus-Strong-Tonhöhe, YIN-Tonerkennung, Pitch-Tracker, Import (GP7, MusicXML, alphaTex, MIDI, JSON), Speicherung/Wiederherstellung, Fortschrittsberechnung, Statistiken/Empfehlungen/Erfolge, Lektionsinhalte, Editor-Modell, UI-Komponenten (Tuner, Griffbrett, Metronom).

## Projektstruktur

```
src/app         App-Shell, Router, Bootstrap, Bottom-Navigation
src/components  UI-Bausteine
src/core        Geschäftslogik ohne React (music, audio, import, storage, content, progress)
src/features    Seiten: dashboard, tuner, fretboard, metronome, songs, player, lessons, practice, listen, editor, progress, settings, tools
src/hooks       React-Hooks
public/samples  Beispieldateien (eigene Kompositionen) für den Import
scripts/        Icon- und Beispieldatei-Generatoren
e2e/            Playwright-Tests
```

Details zu den Entscheidungen: `ARCHITECTURE.md`. Stand der Umsetzung: `STATUS.md`. Nächste Schritte: `ROADMAP.md`.

## Nutzung auf dem iPhone

1. GuitarCoach in **Safari** öffnen (HTTPS).
2. **Teilen → Zum Home-Bildschirm** – danach startet die App im Vollbild (Safe Areas für Dynamic Island und Home-Indikator werden berücksichtigt).
3. Beim ersten Start des Stimmgeräts den **Mikrofonzugriff erlauben**. Audio wird nur lokal analysiert.
4. Der erste Ton (Griffbrett, Player) schaltet Audio frei – iOS verlangt dafür eine Berührung.
5. Im Hintergrund (Anruf, App-Wechsel) pausiert die Wiedergabe automatisch; das Mikrofon wird freigegeben.
6. Speichergrenzen: Safari kann Website-Daten nach längerer Nichtnutzung löschen – unter *Einstellungen → Daten & Sicherung* regelmäßig eine JSON-Sicherung exportieren. Im privaten Modus wird nichts dauerhaft gespeichert.

Später ist eine Auslieferung als native App mit Capacitor vorgesehen; die Architektur (reines Web, keine Server-Abhängigkeit) ist darauf vorbereitet.

## Unterstützte Tab-Dateiformate

| Format | Endung | Status |
| --- | --- | --- |
| Guitar Pro 3/4/5 | .gp3 .gp4 .gp5 | getestet (alphaTab) |
| Guitar Pro 6 | .gpx | unterstützt (alphaTab) |
| Guitar Pro 7/8 | .gp | getestet mit Beispieldatei |
| MusicXML | .xml .musicxml .mxl | getestet mit Beispieldatei |
| alphaTex | .atex .alphatex .tex | getestet |
| MIDI (Format 0/1) | .mid .midi | getestet; Saiten/Bünde werden automatisch berechnet, Dauern auf 16tel gerundet |
| GuitarCoach-JSON | .gcjson .json | getestet (Export/Import, Datensicherung) |
| ASCII-Text-Tabs | .txt | noch nicht (fehlende Notenlängen – siehe Roadmap) |

Nach dem Import landen Songs in der Bibliothek, werden lokal gespeichert und sind offline im Player nutzbar (ansehen, anhören, verlangsamen, Abschnitte wiederholen, Griffbrett, Spiel-mit-Kontrolle).

## Urheberrecht

GuitarCoach enthält keine fremden Tabs. Mitgeliefert sind ausschließlich eigene Arrangements gemeinfreier Lieder (Happy Birthday, Jingle Bells, O Tannenbaum, Stille Nacht, Alle Jahre wieder, Morgen kommt der Weihnachtsmann) und eigene Übungen. Geschützte Songs (Elvis, Beatles, Metallica, NDW, Rock, Last Christmas) sind als Einträge mit Status „Tab-Datei nötig“ angelegt – Noten müssen aus eigenen, rechtmäßig erworbenen Dateien importiert werden. Die App kopiert nichts von Songsterr, Ultimate Guitar o. ä.

## Lizenzen verwendeter Bibliotheken und Ressourcen

| Komponente | Lizenz |
| --- | --- |
| alphaTab | MPL-2.0 |
| Bravura (Musikschrift, von alphaTab mitgeliefert) | SIL Open Font License 1.1 |
| React, React DOM, React Router | MIT |
| Vite, @vitejs/plugin-react, vite-plugin-pwa, Workbox | MIT |
| Tailwind CSS | MIT |
| Dexie.js, dexie-react-hooks | Apache-2.0 |
| Lucide Icons | ISC |
| Vitest, Testing Library, Playwright | MIT / Apache-2.0 |
| Gitarrenklang (Karplus-Strong), Metronom-Klick, Arrangements, Übungen, Lektionstexte, Icons | eigene Erzeugung im Projekt |

Der SoundFont von alphaTab (SONiVOX, Apache-2.0) wird nicht genutzt und nicht ausgeliefert.
