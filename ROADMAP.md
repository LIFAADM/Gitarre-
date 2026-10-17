# GuitarCoach – Roadmap

## Erledigt (Phase 1 – MVP, plus Teile von Phase 2/3)
Siehe STATUS.md.

## Nächste sinnvolle Schritte

### Kurzfristig
1. **Manuelle iPhone-Tests** (Safari, Home-Bildschirm): Mikrofon-Latenz, Lautstärke des Synths, Safe Areas im Querformat, Verhalten bei Anruf/Hintergrund (siehe STATUS.md, Checkliste).
2. **Noten-Ansicht ausbauen**: Abspielmarke in der alphaTab-Partitur (Beat-Cursor über `tickLookup`), Antippen von Noten, Worker-Rendering für sehr lange Stücke.
3. **Text-Tab-Import (ASCII)** mit Hinweis auf fehlende Notenlängen und manueller Dauer-Zuweisung im Editor.
4. **Vereinfachung erweitern**: Wahl der Stimme (Melodie/Bass), Tempo-Vorschlag, automatische Zerlegung in Übungsabschnitte mit Schleifen-Vorgaben.

### Mittelfristig
5. **Audiodatei-Import und Mitspielmodus** (MP3/WAV/M4A): Zuordnung zum Song, manuelle Zeitmarken (Takt ↔ Sekunde), Abschnittswiederholung mit Original.
6. **Mehrspurige Wiedergabe** (Begleitspuren leiser mitspielen, Solo/Mute je Spur).
7. **Erweiterte Lernkontrolle**: Rhythmus-Bewertung (zu früh/zu spät relativ zum Metronom), Akkorderkennung (Mehrton-Analyse), Verlauf der Trefferquote pro Takt („Heatmap“).
8. **Lernplan-Feinschliff**: Wochenplan, Erinnerungen (Web-Push erst mit Capacitor), adaptive Vorschläge aus Fehlerstatistik.
9. **Weitere Lernstufen und Inhalte**: Kapitel zu Akkordbegleitung, Barré, Lagenwechsel; mehr gemeinfreie Lieder (Volkslieder, Klassik-Etüden).

### Langfristig
10. **Capacitor-App** (iOS): natives Mikrofon-Handling, Hintergrundaudio-Policies, Datei-Import über die Dateien-App, App-Store-Vertrieb (Apple-Entwicklerkonto nötig).
11. **Performance**: Routen-Splitting (alphaTab bereits lazy), virtuelles Rendering sehr langer Tabs, Web Worker für YIN bei Bedarf.
12. **Offizielle Anbieter-Integrationen** (nur mit Berechtigung und API), Cloud-Sync optional und verschlüsselt.
