# GuitarCoach – Roadmap

## Erledigt (Phase 1 – MVP, plus Teile von Phase 2/3)
Siehe STATUS.md.

## Nächste sinnvolle Schritte

### Kurzfristig
1. **Manuelle iPhone-Tests** (Safari, Home-Bildschirm): echte Gitarre vor dem Mikrofon, Lautstärke des Synths, Safe Areas im Querformat, Verhalten bei Anruf/Hintergrund (siehe STATUS.md, Checkliste). Die App steht dafür über GitHub Pages per HTTPS bereit.
2. **Noten-Ansicht ausbauen**: Abspielmarke in der alphaTab-Partitur (Beat-Cursor über `tickLookup`), Antippen von Noten, Worker-Rendering für sehr lange Stücke.
3. **Vereinfachung erweitern**: Wahl der Stimme (Melodie/Bass), Tempo-Vorschlag, automatische Zerlegung in Übungsabschnitte mit Schleifen-Vorgaben.
4. **Mitspielmodus verfeinern**: Wellenform-Anzeige, Tap-Tempo zum Setzen mehrerer Marken in einem Durchlauf, Marken aus Importdateien mit Zeitangaben übernehmen.

### Mittelfristig
5. **Text-Tab-Import**: Mehrstimmigkeit, Rhythmuszeilen über der Tab auswerten, Dauer-Korrektur direkt in der Vorschau.
6. **Mehrspurigkeit**: Solo/Mute je Spur, Spurlautstärken speichern, Begleitspuren im Mitspielmodus mit Original mischen.
7. **Erweiterte Lernkontrolle**: Rhythmus-Bewertung (zu früh/zu spät relativ zum Metronom), Akkorderkennung (Mehrton-Analyse), Verlauf der Trefferquote pro Takt („Heatmap“).
7a. **Sprachbegleitung und Coach ausbauen**: vorgelesene Tagesplan-Zusammenfassung, Sprachausgabe für „Tabs verstehen“, Coach-Tipps zu Rhythmus (sobald Rhythmus-Bewertung existiert) und zu Akkordgriffen; Spracheingabe nur, wenn eine rein lokale Erkennung ohne Serverkontakt verfügbar ist.
7c. **Mitspiel-Bahn ausbauen**: Tabulatur synchron unter der Bahn, Schleife für schwache Takte direkt aus dem Ergebnis, Begleitspuren ohne Melodie als Playback (sobald das Mikrofon die Ausgabe sicher ausblenden kann), Verlauf der Trefferquote je Takt über mehrere Durchläufe.
7d. **Kinder-Schule erweitern**: weitere Lektionen (F und G einzeln, Daumen-Wechselschlag, erste Zweiklänge, Rhythmus klatschen und spielen), Wiederholungslektionen nach Pausen, Elternbericht mit geübten Tönen und Trefferquoten.
7b. **Kinder-Modus ausbauen**: mehr Lieder ohne Greifen (Leersaiten-Melodien), Aufnahme eigener Elternstimme für Anleitungen, Belohnungsbilder statt nur Sterne, Zeitbegrenzung pro Sitzung für Eltern, Linkshänder-Darstellung der Farbbalken.
8. **Lernplan-Feinschliff**: Wochenplan, Erinnerungen (Web-Push erst mit Capacitor), adaptive Vorschläge aus Fehlerstatistik.
9. **Weitere Lernstufen und Inhalte**: Kapitel zu Akkordbegleitung, Barré, Lagenwechsel; mehr gemeinfreie Lieder (Volkslieder, Klassik-Etüden).

### Langfristig
10. **Capacitor-App** (iOS): Xcode-Build aus der vorbereiteten Konfiguration, natives Mikrofon-Handling, Hintergrundaudio-Policies, Datei-Import über die Dateien-App, App-Store-Vertrieb (Apple-Entwicklerkonto nötig).
11. **Performance**: Routen-Splitting (alphaTab bereits lazy), virtuelles Rendering sehr langer Tabs, Web Worker für YIN bei Bedarf.
12. **Offizielle Anbieter-Integrationen** (nur mit Berechtigung und API), Cloud-Sync optional und verschlüsselt.
