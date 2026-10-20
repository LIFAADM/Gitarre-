# Echte Aufnahmen für den Erkennungs-Benchmark

Hier liegen Aufnahmen einer echten Nylonsaiten-Gitarre, aufgenommen mit dem iPhone über das
Erkennungs-Labor der App (Profil → Erkennungs-Labor). Der Benchmark `npm run bench:detection`
(Phase 2) liest alle Paare aus `*.wav` + `*.json` und misst Trefferquote, Fehlalarme und Timing.

## Dateiformat

Je Aufnahme zwei Dateien mit gleichem Namen, z. B.

```
2026-10-19-1432-leersaite-a-5.wav
2026-10-19-1432-leersaite-a-5.json
```

- **WAV**: PCM 16 Bit, mono, Abtastrate des Geräts (iPhone meist 48000 Hz). Unverändert, ohne
  Rauschunterdrückung, Echo-Unterdrückung oder automatische Verstärkung.
- **JSON** (Beschriftung, von der App erzeugt):

```json
{
  "version": 1,
  "label": "Leersaite A (5)",
  "kind": "einzelton",
  "expected": [{ "midi": 45, "string": 5, "fret": 0 }],
  "notes": "",
  "recordedAt": "2026-10-19T14:32:10.000Z",
  "sampleRate": 48000,
  "durationSec": 6.4,
  "device": "iPhone|Safari|app|48000",
  "appVersion": "0.1.0",
  "calibration": { "noiseFloorDb": -58, "gateRms": 0.004, "latencyMs": 95 }
}
```

`kind`: `einzelton` (ein Ton, ggf. mehrfach angeschlagen), `akkord` (alle Töne gleichzeitig),
`folge` (Töne nacheinander in der Reihenfolge von `expected`), `stille` (nur Raum), `frei`
(Beschreibung in `notes`).

## Welche Aufnahmen helfen

1. Jede Leersaite einzeln, dreimal angeschlagen (6 Aufnahmen).
2. Wiederholter Ton A (5): achtmal im Sekundentakt (Anschlagerkennung).
3. Tonleiter C-Dur in der ersten Lage.
4. Akkorde a-Moll, E-Dur, e-Moll, C-Dur, G-Dur, D-Dur.
5. Zehn Sekunden Stille im Übungsraum.
6. Varianten: leise gespielt, laut gespielt, iPhone weiter weg, mit Hintergrundgeräusch.

## Vom iPhone hierher

In der App: Aufnahme → Teilen → „In Dateien sichern“. Dann in Safari
https://github.com/LIFAADM/Gitarre-/upload/main/test-audio/real öffnen, beide Dateien hochladen,
„Commit directly to main“. Dateinamen nicht ändern.

Mikrofon-Audio verlässt sonst nie das Gerät – nur diese bewusst exportierten Aufnahmen.
