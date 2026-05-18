# StayAI Localization Script

## Kurzbeschreibung

Dieses Script korrigiert clientseitig englische StayAI-Oberflächentexte sowie Datums-, Uhrzeit- und Währungsformate in ein deutsches Format. Es wurde für den Einsatz über ein vorhandenes Custom-JS-Feld entwickelt und läuft vollständig im Browser.

## Was löst das Script?

Das Script behebt Lokalisierungsprobleme in StayAI, bei denen Inhalte teilweise oder vollständig auf Englisch angezeigt werden. Zusätzlich normalisiert es Datum, Uhrzeit und EUR-Währungsangaben für die Ziel-Locale `de-DE`.

Konkret werden unter anderem folgende Fälle behandelt:

- fehlende englische Texte werden ersetzt
- Datumsangaben werden deutsch formatiert
- Uhrzeiten werden in ein deutsches 24-Stunden-Format gebracht
- EUR-Währungsbeträge werden im deutschen Format angezeigt
- dynamisch nachgeladene Inhalte werden nachträglich korrigiert
- Seitenwechsel innerhalb der App werden berücksichtigt

## Kontext

StayAI stellt an der betroffenen Stelle keine direkte Möglichkeit bereit, die Übersetzungen, Datumsformate, Uhrzeitformate oder Währungsdarstellung vollständig über App-Code, Dokumentation oder eine öffentliche API anzupassen.

Deshalb wurde eine clientseitige Lösung über JavaScript Injection gewählt. Das Script wird über ein vorhandenes Custom-JS-Feld eingebunden und korrigiert die relevanten DOM-Inhalte nach dem Rendern.

## Ansatz

Die Lösung arbeitet DOM-basiert und vermeidet bewusst globale `innerHTML`-Manipulationen.

Stattdessen werden gezielt verarbeitet:

- Text Nodes
- relevante Attribute wie `placeholder`, `title`, `aria-label` und `alt`
- dynamisch hinzugefügte DOM-Knoten
- gesplittete Währungsdarstellungen innerhalb mehrerer Text Nodes

Dadurch bleibt die Lösung kontrollierter und reduziert das Risiko, Event Listener, Komponentenstruktur oder HTML-Markup unnötig zu beschädigen.

## Features

- Übersetzung definierter englischer UI-Texte
- Unterstützung für Text Nodes und relevante Attribute
- deutsche Datumsformate
- deutsche Uhrzeitformate
- deutsche EUR-Währungsformatierung
- Erkennung von gesplitteten Währungswerten im DOM
- `MutationObserver` für dynamisch nachgeladene Inhalte
- zusätzliche Behandlung von SPA-Routenwechseln
- mehrfach ausführbar und idempotent
- Debug-Statistiken über `StayAILocalization.report()`
- erweiterbare Translation Map
- Schutz vor Verarbeitung irrelevanter Tags wie `SCRIPT`, `STYLE`, `TEXTAREA`, `CODE` und `PRE`

## Nutzung / Testen

### Variante 1: Browser Console

1. Testseite öffnen
2. Script in die Browser Console einfügen
3. Ausführen
4. Sichtbare Inhalte prüfen

### Variante 2: Dateiinhalt verwenden

Alternativ kann der Inhalt aus folgender Datei kopiert und im Custom-JS-Feld eingefügt werden:

```text
src/stayai-localization.js
```

## Verfügbare Befehle

Nach dem Laden steht das Script global über `window.StayAILocalization` zur Verfügung.

```js
StayAILocalization.run();
```

Führt die Lokalisierung manuell erneut aus.

```js
StayAILocalization.observe();
```

Startet den `MutationObserver`, falls er noch nicht aktiv ist.

```js
StayAILocalization.stop();
```

Stoppt den aktiven `MutationObserver`.

```js
StayAILocalization.report();
```

Gibt Debug-Statistiken zurück, zum Beispiel Anzahl der Runs, geänderter Text Nodes, Attribute und Gesamtänderungen.

## Dateistruktur

```text
src/
  stayai-localization.js

README.md
```

Optional:

```text
presentation-notes.md
test-cases.md
```

### Übersetzungen zur Laufzeit ergänzen

Neue Übersetzungen können während des Testens direkt über die Browser Console ergänzt werden.

```js
StayAILocalization.addTranslation("Billed every", "Abgerechnet alle");
```

## Getroffene Annahmen

- Ziel-Locale ist `de-DE`
- Währung ist `EUR`
- Lösung läuft clientseitig über JavaScript Injection
- StayAI-Inhalte können dynamisch gerendert oder nachgeladen werden
- die Translation Map kann bei Bedarf erweitert werden
- kein direkter Zugriff auf StayAI-App-Code, Dokumentation oder API ist verfügbar

## Bekannte Grenzen / Trade-offs

- DOM-basierte Lösungen sind fragiler als eine echte i18n-Integration im App-Code
- Änderungen am StayAI-Markup können Anpassungen am Script erforderlich machen
- automatische Übersetzung unbekannter Texte ist bewusst nicht enthalten
- Regex-basierte Datumserkennung deckt definierte Formate ab, aber nicht jedes mögliche Datumsformat
- neue oder geänderte englische UI-Texte müssen manuell in der Translation Map ergänzt werden

## Testfälle

Folgende Fälle sollten beim Testen geprüft werden:

- sichtbare englische Texte werden ersetzt
- `placeholder`, `aria-label`, `title` und `alt` werden ersetzt
- Datumsangaben werden deutsch formatiert
- Uhrzeiten werden im 24-Stunden-Format angezeigt
- Währungsbeträge werden als deutsches EUR-Format angezeigt
- dynamisch eingefügte Inhalte werden nachträglich korrigiert
- Seitenwechsel innerhalb der App behalten die Lokalisierung bei
- mehrfaches Ausführen erzeugt keine fehlerhaften Dopplungen
- bereits korrekt formatierte EUR-Beträge werden nicht erneut kaputt formatiert

## KI-Nutzung

KI wurde als Sparringspartner für Struktur, Edge Cases und Code Review genutzt.

Die finale Lösung wurde verstanden, getestet und angepasst. Insbesondere wurden Fälle wie dynamisch gerenderte Inhalte, SPA-Seitenwechsel und fehlerhafte Mehrfachformatierung von Währungsbeträgen berücksichtigt.

Links:
https://claude.ai/share/67708d8d-24f2-4427-bc93-469641128d1d
https://chatgpt.com/g/g-p-6a09eb7d4e50819194fe6b73d071cbb4-case-study-meta/project

## Mögliche Weiterentwicklung

- Translation Map aus externer JSON-Datei laden
- zusätzliche Testfälle dokumentieren
- visuelle Regression Tests ergänzen
- Monitoring oder Logging für nicht übersetzte Texte einbauen
- robustere Selektoren verwenden, falls StayAI stabile Attribute bereitstellt
- automatisierte Tests für Datums-, Uhrzeit- und Währungsformatierung ergänzen

```

```
