# StayAI Localization Injection

Kleines JavaScript-Projekt zur nachträglichen Lokalisierung des StayAI Customer Portals für deutsche Nutzer.

## Kurzbeschreibung

Das Script übersetzt fehlende englische UI-Texte, formatiert Datumswerte, Uhrzeiten und EUR-Beträge in deutsche Schreibweise und reagiert auf dynamisch nachgeladene Inhalte innerhalb der App.

Die Lösung ist als JavaScript Injection gedacht, weil kein direkter Zugriff auf den App-Code, die StayAI-Templates oder eine offizielle Übersetzungs-API vorausgesetzt wird.

## Features

- Übersetzung zentral definierter UI-Texte
- Deutsche Datumsformate, z. B. `May 14, 2026` zu `14.05.2026`
- Deutsche Uhrzeitformate, z. B. `2:30 PM` zu `14:30 Uhr`
- Deutsche EUR-Währungsformatierung, z. B. `€89.92` zu `89,92 €`
- Unterstützung für dynamisch gerenderte Inhalte durch `MutationObserver`
- Unterstützung für SPA-Seitenwechsel durch History- und Route-Hooks
- Idempotente Verarbeitung, damit Werte nicht mehrfach falsch formatiert werden
- Runtime API zum Testen und Debuggen über die Browser Console

## Projektstruktur

```txt
src/
  index.js
  config.js
  translation.js
  formatters/
    date.js
    times.js
    currency.js
  core/
    debug.js
    dom.js
    localization.js
    observer.js
    routeHook.js

dist/
  stayai-localization.js
```

## Nutzung

Die modularen Dateien in `src/` sind für Entwicklung und Wartung gedacht.

Für die Nutzung in der Browser Console, in einem Custom-JS-Feld oder über Tampermonkey wird daraus eine einzelne Datei gebaut:

```bash
npm install
npm run build
```

Danach kann der Inhalt dieser Datei verwendet werden:

```txt
dist/stayai-localization.js
```

## Nutzung mit Tampermonkey

Für lokale Tests kann das Script über Tampermonkey automatisch auf der Case-Study-Seite ausgeführt werden.

Tampermonkey:
[https://www.tampermonkey.net/](https://www.tampermonkey.net/)

Dazu ein neues Userscript erstellen, diesen Header einfügen und darunter den Inhalt aus `dist/stayai-localization.js` setzen:

```js
// ==UserScript==
// @name         StayAI Localization Demo
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Injects the StayAI localization layer for the Metaflow X case study demo.
// @match        https://metaflow-x-casestudy.lovable.app/*
// @match        http://metaflow-x-casestudy.lovable.app/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
```

In Chrome muss eventuell zusätzlich aktiviert werden:

```txt
chrome://extensions → Tampermonkey → Details → Allow user scripts
```

Nach dem Refresh kann in der Console geprüft werden, ob die Injection aktiv ist:

```js
window.StayAILocalization;
StayAILocalization.report();
```

Tampermonkey ist hier nur für lokale Tests gedacht. In einer echten Integration würde derselbe Bundle-Code über Custom JS, Theme Snippet, App Embed oder Tag Manager geladen werden.

## Verfügbare Console API

Nach dem Ausführen ist die API über `window.StayAILocalization` verfügbar:

```js
StayAILocalization.run();
StayAILocalization.observe();
StayAILocalization.stop();
StayAILocalization.restart();
StayAILocalization.report();
StayAILocalization.listTranslations();
StayAILocalization.addTranslation("Source", "Ziel");
StayAILocalization.setDebug(true);
StayAILocalization.showChangeLog();
```

## Ansatz

Das Script arbeitet gezielt auf Text-Nodes und relevanten Attributen wie `placeholder`, `title`, `aria-label` und `alt`.

Es vermeidet globale `innerHTML`-Manipulationen, damit React-gerenderte Inhalte nicht unnötig zerstört oder neu aufgebaut werden. Dynamische Inhalte werden über einen `MutationObserver` verarbeitet. Bei SPA-Navigationen werden zusätzliche Runs nach dem Route-Wechsel ausgeführt, damit neu gerenderte Inhalte ebenfalls lokalisiert werden.

## Build

Beispiel mit `esbuild`:

```json
{
  "scripts": {
    "build": "esbuild src/index.js --bundle --format=iife --outfile=dist/stayai-localization.js"
  },
  "devDependencies": {
    "esbuild": "^0.25.0"
  }
}
```

## Getroffene Annahmen

- Die App stellt kein direkt nutzbares Übersetzungsinterface bereit.
- Die Injection läuft im Browser-Kontext nach dem Laden der Seite.
- Neue Übersetzungen können zentral in `translation.js` ergänzt werden.
- Die finale Nutzung erfolgt über eine gebündelte Single-File-Version.

## Status

Die aktuelle Version ist als funktionaler Proof of Concept ausgelegt und für die Case Study testbar. Die modulare Struktur erleichtert spätere Erweiterungen, während der Build weiterhin eine einzelne console-kompatible Datei erzeugt.

## KI Nutzung

Wie in der Aufgabenstellung erlaubt, wurde ChatGPT unterstützend für Strukturierung, Code-Review, Debugging und Formulierungen verwendet.

Der geteilte ChatGPT-Link zur Einsicht der KI-Nutzung ist hier verfügbar:
[ChatGPT-Projekt / Verlauf](https://chatgpt.com/g/g-p-6a09eb7d4e50819194fe6b73d071cbb4-case-study-meta/project)

Die finale Implementierung wurde eigenständig geprüft und im Browser getestet.
