# GuitarCoach – meine persönliche Gitarren-Lernapp

GuitarCoach ist eine deutschsprachige Progressive Web App (PWA) zum Gitarrelernen auf der klassischen Konzertgitarre – gedacht für absolute Anfänger, optimiert für das iPhone, komplett offline, ohne Konto, Werbung oder Cloud.

**Kernfunktionen**

- 🎸 **Stimmgerät** mit dem iPhone-Mikrofon (YIN-Tonerkennung, Cent-Anzeige, Nadel, Saitenerkennung, Referenztöne)
- 🎼 **Interaktiver Tab-Player** mit echter Klangwiedergabe (eigener Nylonsaiten-Synthesizer), Tempo 25–150 %, Abschnittsschleife, Einzeltonmodus, Metronom mit Einzähler, Griffbrett-Anzeige der aktuellen Note, umschaltbare Noten-Ansicht (klassische Notenschrift + Tab) und automatische Vereinfachung zu einer Übungsstimme
- 📚 **Gitarrenschule** mit 7 Kapiteln und 44 Lektionen (Erklärung, Übung, Hörbeispiel, Griffbrett, Selbstkontrolle, Speicherung)
- 🎵 **Songbibliothek** mit allen Wunsch-Songs: sechs gemeinfreie Lieder sofort spielbar (eigene Arrangements in mehreren Lernversionen), geschützte Songs mit Importstatus und eigenen Vorübungen
- 📥 **Import** von Guitar Pro 3–8, MusicXML, alphaTex, MIDI, ASCII-Text-Tabs und GuitarCoach-JSON – lokal verarbeitet, offline nutzbar
- 🎧 **Mitspielmodus** mit eigener Aufnahme (MP3/WAV/M4A): Zeitmarken setzen, Tabs laufen synchron, Abschnitte wiederholen, Tempo reduzieren
- 🎼 **Mehrspurige Wiedergabe**: Begleitspuren eines Imports leiser mitspielen lassen
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
| Tests | Vitest + Testing Library (162 Unit-/Komponententests), Playwright (16 End-to-End-Tests, davon 2 mit simuliertem Mikrofon) |
| CI/Deployment | GitHub Actions: Typprüfung, Lint, Tests, Build, E2E; GitHub-Pages-Deployment mit HTTPS |
| Native App | Capacitor-Konfiguration vorbereitet (iOS) |

## Installation und Start

Voraussetzung: Node.js ≥ 20 (getestet mit 22) und npm.

```bash
npm install
npm run dev          # Entwicklungsserver (http://localhost:5173, im LAN per --host erreichbar)
```

Für Mikrofonzugriff vom iPhone im lokalen Netz wird **HTTPS** benötigt (Browser-Vorgabe). Auf dem Entwicklungsrechner selbst reicht `localhost`.

### HTTPS-Bereitstellung über GitHub Pages (empfohlen fürs iPhone)

Der Workflow `.github/workflows/deploy-pages.yml` baut die App mit dem Basis-Pfad `/<Repository-Name>/` und veröffentlicht sie auf GitHub Pages.

**Einmalig von Hand nötig** (der Workflow-Token darf Pages nicht selbst aktivieren): Im Repository auf GitHub **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen. Danach unter **Actions → „GitHub Pages (HTTPS-Bereitstellung)“ → „Run workflow“** den Branch starten oder einfach erneut pushen. Anschließend ist GuitarCoach unter `https://<nutzer>.github.io/<repository>/` erreichbar, inklusive Mikrofon und Offline-Installation. Für private Repositories setzt GitHub Pages einen kostenpflichtigen Plan voraus; alternativ den Ordner `dist/` auf einen beliebigen HTTPS-Host (Netlify, Vercel, eigener Server) legen.

Eigener Host: `GUITARCOACH_BASE=/unterpfad/ npm run build` setzt den Basis-Pfad; ohne Variable liegt die App unter `/`.

## Produktions-Build

```bash
npm run build        # erzeugt dist/ inkl. Service Worker und Manifest
npm run preview      # lokaler Server für den Build (http://127.0.0.1:4173)
```

`dist/` ist statisch und kann auf jedem HTTPS-Webspace liegen. Der Service Worker cached die App nach dem ersten Laden vollständig (ca. 3 MB inkl. Importbibliothek und Notenschrift), danach läuft sie offline.

## Tests

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint (inkl. React-Hooks-Regeln)
npm test             # Vitest (Unit/Komponenten)
npm run build        # Produktions-Build
PW_CHROMIUM_PATH=/pfad/zu/chromium npm run e2e   # Playwright-Tests gegen den Build (ohne Variable nutzt Playwright seinen eigenen Chromium)
npm run check        # typecheck + lint + test + build
```

Die Playwright-Projekte `mic-tuner` und `mic-listen` speisen über Chromiums Fake-Mikrofon synthetische Gitarrentöne (`e2e/fixtures/*.wav`, erzeugt mit `npm run audio:fixtures`) in die echte Analysekette ein: Das Stimmgerät muss A2 = 110 Hz als „richtig gestimmt“ erkennen, der Spiel-mit-Modus muss die gespielten leeren Saiten zählen.

Getestete Bereiche: Frequenz↔Note und Cent, Stimmung/Saitenerkennung, Bund-/Saitenpositionen, Notendauern und Timing, Tab-Notation, Abspielplan (Wiederholungen, Tempo), Player-Timing (50 %, Schleife, Einzähler, Einzelton), Karplus-Strong-Tonhöhe, YIN-Tonerkennung, Pitch-Tracker, Import (GP7, MusicXML, alphaTex, MIDI, JSON), alphaTex-Export (Rundreise durch alphaTab), automatische Vereinfachung, Speicherung/Wiederherstellung, Fortschrittsberechnung, Statistiken/Empfehlungen/Erfolge, Lektionsinhalte, Editor-Modell, UI-Komponenten (Tuner, Griffbrett, Metronom).

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

### Native iPhone-App mit Capacitor (vorbereitet)

`capacitor.config.ts`, `@capacitor/core`, `@capacitor/cli` und `@capacitor/ios` sind eingerichtet. Auf einem Mac mit Xcode:

```bash
npm run build
npx cap add ios          # einmalig: erzeugt das Xcode-Projekt unter ios/
npm run cap:sync         # Web-Build in die App kopieren
npm run cap:ios          # Xcode öffnen, auf dem iPhone ausführen
```

In `ios/App/App/Info.plist` muss `NSMicrophoneUsageDescription` (z. B. „GuitarCoach analysiert dein Gitarrenspiel für Stimmgerät und Lernkontrolle.“) ergänzt werden. Das Schema `https` in der Konfiguration sorgt dafür, dass Mikrofon und Service Worker im WKWebView funktionieren. Die native Paketierung wurde in dieser Umgebung (Linux, ohne Xcode) nicht ausgeführt; für den App-Store-Vertrieb ist ein Apple-Entwicklerkonto nötig, zum Testen auf dem eigenen Gerät reicht ein kostenloses Apple-Konto.

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
| ASCII-Text-Tabs | .txt .tab | getestet; Notenlängen werden aus den Abständen geschätzt oder fest angenommen, deutlich gekennzeichnet und im Tab-Editor korrigierbar |
| Audiodateien (Mitspielmodus) | .mp3 .wav .m4a | gespeichert und per Zeitmarken manuell synchronisiert |

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
