(() => {
  "use strict";

  // Console demos often run the snippet more than once. Stop an older copy first.
  if (window.StayAILocalization?.stop) {
    window.StayAILocalization.stop();
  }

  /**
   * StayAI Localization Injection
   *
   * Purpose:
   * - Translate missing English UI strings in the StayAI customer portal
   * - Format dates, times and EUR currency values for German customers
   * - Handle dynamically rendered SPA content
   * - Handle split text nodes without destroying React-controlled number nodes
   * - Keep the solution extendable through a centralized translation dictionary
   * - Allow runtime additions through the browser console
   * - Provide optional debug logs and an inspectable change history
   */

  const TRANSLATION_GROUPS = {
    navigation: {
      "Notifications (F8)": "Benachrichtigungen (F8)",
    },

    subscriptionStates: {
      Active: "Aktiv",
      Paused: "Pausiert",
      Skipped: "Übersprungen",
    },

    subscriptionLabels: {
      "New Subscription": "Neues Abonnement",
      "New Abonnement": "Neues Abonnement",
      "Paused Abonnements": "Pausierte Abonnements",
      Subscriptions: "Abonnements",
      Subscription: "Abonnement",
    },

    subscriptionDetails: {
      "Started on": "Gestartet am",
      "Selected flavors: (": "Ausgewählte Geschmacksrichtungen: (",
      "flavors for": "Geschmacksrichtungen für",
      "Weiter delivery:": "Nächste Lieferung:",
      "Next delivery:": "Nächste Lieferung:",
    },

    selectionSummary: {
      "You have selected": "Du hast",
      selected: "ausgewählt",
      of: "von",
      flavors: "Geschmacksrichtungen",
    },

    billingFrequency: {
      "Billed every": "Alle",
    },

    statusLines: {
      "Skipped until": "Übersprungen bis",
      "Paused until": "Pausiert bis",
    },

    frequencyUnits: {
      Every: "Alle",
      every: "alle",
      week: "Woche",
      weeks: "Wochen",
      day: "Tag",
      days: "Tage",
      month: "Monat",
      months: "Monate",
    },

    actions: {
      "Skip next": "Nächste Lieferung überspringen",
      Unskip: "Überspringen aufheben",
      Resume: "Fortsetzen",
      Edit: "Bearbeiten",
      Remove: "Entfernen",
      Manage: "Verwalten",
    },

    orderAndAccount: {
      "Order history": "Bestellverlauf",
      "Next order": "Nächste Bestellung",
      "Shipping address": "Lieferadresse",
      "Payment method": "Zahlungsmethode",
      Quantity: "Menge",
      Frequency: "Häufigkeit",
    },
  };

  function createTranslationMap(groups) {
    return new Map(
      Object.values(groups).flatMap((group) => Object.entries(group)),
    );
  }

  const StayAILocalization = {
    observer: null,
    debounceTimer: null,
    debounceStart: null,
    isRunning: false,
    pendingRun: false,
    routeHookInstalled: false,
    compiledPatterns: null,
    changeLog: [],

    stats: {
      runs: 0,
      runsWithChanges: 0,
      textNodesChanged: 0,
      attributesChanged: 0,
      splitCurrencyNodesChanged: 0,
      splitPhraseElementsChanged: 0,
      totalChanges: 0,
      runtimeTranslationsAdded: 0,
      runtimeTranslationsRemoved: 0,
    },

    config: {
      root: document.body,
      debounceMs: 50,
      maxWaitMs: 1000,
      debug: true,
      logToConsole: true,
      logRunSummary: true,
      logLimit: 150,
      attributes: ["placeholder", "title", "aria-label", "alt"],
      ignoredTags: new Set([
        "SCRIPT",
        "STYLE",
        "NOSCRIPT",
        "IFRAME",
        "SVG",
        "CANVAS",
        "TEXTAREA",
        "CODE",
        "PRE",
      ]),
    },

    translationGroups: TRANSLATION_GROUPS,
    translations: createTranslationMap(TRANSLATION_GROUPS),

    monthTranslations: new Map([
      ["Jan", "Jan."],
      ["January", "Januar"],
      ["Feb", "Feb."],
      ["February", "Februar"],
      ["Mar", "März"],
      ["March", "März"],
      ["Apr", "Apr."],
      ["April", "April"],
      ["May", "Mai"],
      ["Jun", "Juni"],
      ["June", "Juni"],
      ["Jul", "Juli"],
      ["July", "Juli"],
      ["Aug", "Aug."],
      ["August", "August"],
      ["Sep", "Sept."],
      ["September", "September"],
      ["Oct", "Okt."],
      ["October", "Oktober"],
      ["Nov", "Nov."],
      ["November", "November"],
      ["Dec", "Dez."],
      ["December", "Dezember"],
    ]),

    monthNumbers: new Map([
      ["Jan", "01"],
      ["January", "01"],
      ["Feb", "02"],
      ["February", "02"],
      ["Mar", "03"],
      ["March", "03"],
      ["Apr", "04"],
      ["April", "04"],
      ["May", "05"],
      ["Jun", "06"],
      ["June", "06"],
      ["Jul", "07"],
      ["July", "07"],
      ["Aug", "08"],
      ["August", "08"],
      ["Sep", "09"],
      ["September", "09"],
      ["Oct", "10"],
      ["October", "10"],
      ["Nov", "11"],
      ["November", "11"],
      ["Dec", "12"],
      ["December", "12"],
    ]),

    weekdayTranslations: new Map([
      ["Monday", "Montag"],
      ["Tuesday", "Dienstag"],
      ["Wednesday", "Mittwoch"],
      ["Thursday", "Donnerstag"],
      ["Friday", "Freitag"],
      ["Saturday", "Samstag"],
      ["Sunday", "Sonntag"],
    ]),

    euroFormatter: new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }),

    invalidateTranslationCache() {
      this.compiledPatterns = null;
    },

    addTranslation(source, target) {
      if (!source || !target) {
        console.warn("[StayAI] addTranslation requires source and target.");
        return this.report();
      }

      this.translations.set(String(source), String(target));
      this.stats.runtimeTranslationsAdded += 1;
      this.invalidateTranslationCache();

      console.log(`[StayAI] Translation added: "${source}" -> "${target}"`);

      return this.run(this.config.root);
    },

    addTranslations(entries) {
      if (!entries || typeof entries !== "object") {
        console.warn("[StayAI] addTranslations requires an object.");
        return this.report();
      }

      let added = 0;

      for (const [source, target] of Object.entries(entries)) {
        if (!source || !target) continue;

        this.translations.set(String(source), String(target));
        added += 1;
      }

      this.stats.runtimeTranslationsAdded += added;
      this.invalidateTranslationCache();

      console.log(`[StayAI] ${added} translation(s) added.`);

      return this.run(this.config.root);
    },

    removeTranslation(source) {
      if (!source) {
        console.warn("[StayAI] removeTranslation requires a source string.");
        return this.report();
      }

      const removed = this.translations.delete(String(source));

      if (removed) {
        this.stats.runtimeTranslationsRemoved += 1;
        this.invalidateTranslationCache();
        console.log(`[StayAI] Translation removed: "${source}"`);
        return this.run(this.config.root);
      }

      console.warn(`[StayAI] No translation found for: "${source}"`);
      return this.report();
    },

    listTranslations() {
      const entries = [...this.translations.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([source, target]) => ({ source, target }));

      console.table(entries);
      return entries;
    },

    hasTranslation(source) {
      return this.translations.has(String(source));
    },

    getTranslation(source) {
      return this.translations.get(String(source));
    },

    shouldIgnoreElement(element) {
      if (!element) return true;
      if (this.config.ignoredTags.has(element.tagName)) return true;
      if (element.closest("[data-i18n-ignore]")) return true;
      return false;
    },

    normalizeWhitespace(value) {
      return String(value).replace(/\s+/g, " ").trim();
    },

    escapeRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    preserveOuterWhitespace(original, replacement) {
      const leading = original.match(/^\s*/)?.[0] ?? "";
      const trailing = original.match(/\s*$/)?.[0] ?? "";
      return `${leading}${replacement}${trailing}`;
    },

    makeTranslationPattern(source) {
      const escaped = this.escapeRegExp(source);

      if (/^[A-Za-z]+$/.test(source)) {
        return new RegExp(`\\b${escaped}\\b`, "g");
      }

      return new RegExp(escaped, "g");
    },

    getCompiledPatterns() {
      if (this.compiledPatterns) return this.compiledPatterns;

      this.compiledPatterns = [...this.translations.entries()]
        .sort(([a], [b]) => b.length - a.length)
        .map(([source, target]) => ({
          source,
          target,
          pattern: this.makeTranslationPattern(source),
        }));

      return this.compiledPatterns;
    },

    getDirectTextNodes(element) {
      return [...element.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim(),
      );
    },

    getAllDirectTextNodes(element) {
      return [...element.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
    },

    hasNestedElementChildren(element) {
      return element.children.length > 0;
    },

    setNodeValueIfChanged(node, value) {
      if (!node || node.nodeValue === value) return false;
      node.nodeValue = value;
      return true;
    },

    getElementPath(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;

      const parts = [];
      let current = element;

      while (
        current &&
        current.nodeType === Node.ELEMENT_NODE &&
        parts.length < 5
      ) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          part += `#${current.id}`;
          parts.unshift(part);
          break;
        }

        if (current.classList?.length) {
          part += `.${[...current.classList].slice(0, 2).join(".")}`;
        }

        parts.unshift(part);
        current = current.parentElement;
      }

      return parts.join(" > ");
    },

    logChange(type, before, after, meta = {}) {
      if (!this.config.debug) return;

      const entry = {
        index: this.changeLog.length + 1,
        type,
        before,
        after,
        ...meta,
        timestamp: new Date().toISOString(),
      };

      this.changeLog.push(entry);

      if (this.changeLog.length > this.config.logLimit) {
        this.changeLog.shift();
      }

      if (this.config.logToConsole) {
        console.info(`[StayAI] Changed ${type}`, { before, after, ...meta });
      }
    },

    logRunSummary(runNumber, changes, root) {
      if (!this.config.debug || !this.config.logRunSummary || !changes) return;

      const rootLabel =
        root?.nodeType === Node.ELEMENT_NODE
          ? this.getElementPath(root)
          : root?.nodeType === Node.TEXT_NODE
            ? `text node inside ${this.getElementPath(root.parentElement)}`
            : "unknown root";

      console.info(`[StayAI] Run ${runNumber} completed`, {
        changes,
        root: rootLabel,
        stats: this.report(),
      });
    },

    showChangeLog() {
      console.table(this.changeLog);
      return [...this.changeLog];
    },

    clearChangeLog() {
      this.changeLog = [];
      console.log("[StayAI] Change log cleared.");
      return [];
    },

    setDebug(enabled) {
      this.config.debug = Boolean(enabled);
      console.log(
        `[StayAI] Debug logging ${this.config.debug ? "enabled" : "disabled"}.`,
      );
      return this.report();
    },

    setConsoleLogging(enabled) {
      this.config.logToConsole = Boolean(enabled);
      console.log(
        `[StayAI] Per-change console logging ${
          this.config.logToConsole ? "enabled" : "disabled"
        }.`,
      );
      return this.report();
    },

    markSplitPhraseChange(changed, before = null, after = null, meta = {}) {
      if (!changed) return;

      this.stats.splitPhraseElementsChanged += 1;
      this.stats.totalChanges += 1;

      this.logChange("split-phrase", before, after, meta);
    },

    applyDynamicPhraseRules(value) {
      let result = value;

      result = result.replace(
        /\bYou have selected\s+(\d+)\s+of\s+(\d+)\s+flavors\b/gi,
        "Du hast $1 von $2 Geschmacksrichtungen ausgewählt",
      );

      return result;
    },

    applyTranslations(value) {
      const normalized = this.normalizeWhitespace(value);

      if (this.translations.has(normalized)) {
        return this.preserveOuterWhitespace(
          value,
          this.translations.get(normalized),
        );
      }

      let result = value;

      for (const { pattern, target } of this.getCompiledPatterns()) {
        pattern.lastIndex = 0;
        result = result.replace(pattern, target);
      }

      return result;
    },

    formatDateFragments(value) {
      let result = value;

      result = result.replace(
        /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g,
        (match, day, month) => {
          const translated = this.monthTranslations.get(month);
          return translated ? `${day}. ${translated}` : match;
        },
      );

      result = result.replace(
        /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s*(\d{4})\b/g,
        (match, month, day, year) => {
          const num = this.monthNumbers.get(month);
          return num ? `${String(day).padStart(2, "0")}.${num}.${year}` : match;
        },
      );

      result = result.replace(
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{1,2}\.\d{1,2}\.\d{4})\b/g,
        (match, weekday, datePart) => {
          const translated = this.weekdayTranslations.get(weekday);
          return translated ? `${translated}, ${datePart}` : match;
        },
      );

      return result;
    },

    formatTimeFragments(value) {
      let result = value;

      result = result.replace(
        /\b(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)\b/gi,
        (match, hour, minute, period) => {
          let h = Number(hour);
          const normalizedPeriod = period.toUpperCase();

          if (normalizedPeriod === "PM" && h !== 12) h += 12;
          if (normalizedPeriod === "AM" && h === 12) h = 0;

          return `${String(h).padStart(2, "0")}:${minute} Uhr`;
        },
      );

      result = result.replace(
        /\b(0?[1-9]|1[0-2])\s*(AM|PM)\b/gi,
        (match, hour, period) => {
          let h = Number(hour);
          const normalizedPeriod = period.toUpperCase();

          if (normalizedPeriod === "PM" && h !== 12) h += 12;
          if (normalizedPeriod === "AM" && h === 12) h = 0;

          return `${String(h).padStart(2, "0")}:00 Uhr`;
        },
      );

      return result;
    },

    parseEnglishAmount(rawAmount) {
      const amount = Number(
        String(rawAmount).replace(/\s/g, "").replace(/,/g, ""),
      );

      return Number.isFinite(amount) ? amount : null;
    },

    formatEuroAmount(rawAmount) {
      const amount = this.parseEnglishAmount(rawAmount);
      return amount !== null ? this.euroFormatter.format(amount) : null;
    },

    formatCurrencyFragments(value) {
      const amountPattern =
        "-?(?<![,.\\d])(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+)";

      const pattern = new RegExp(
        `€\\s*(${amountPattern})|(${amountPattern})\\s*€|(${amountPattern})\\s*EUR\\b|\\bEUR\\s*(${amountPattern})`,
        "g",
      );

      return value.replace(pattern, (match, g1, g2, g3, g4) => {
        const raw = g1 ?? g2 ?? g3 ?? g4;
        return this.formatEuroAmount(raw) ?? match;
      });
    },

    localizeValue(value) {
      let result = value;

      result = this.applyDynamicPhraseRules(result);
      result = this.applyTranslations(result);
      result = this.formatDateFragments(result);
      result = this.formatCurrencyFragments(result);
      result = this.formatTimeFragments(result);

      return result;
    },

    processTextNode(node) {
      if (this.shouldIgnoreElement(node.parentElement)) return;

      const original = node.nodeValue;
      const localized = this.localizeValue(original);

      if (localized !== original) {
        node.nodeValue = localized;
        this.stats.textNodesChanged += 1;
        this.stats.totalChanges += 1;

        this.logChange("text-node", original, localized, {
          parentTag: node.parentElement?.tagName,
          path: this.getElementPath(node.parentElement),
        });
      }
    },

    processAttributes(element) {
      if (this.shouldIgnoreElement(element)) return;

      for (const attr of this.config.attributes) {
        if (!element.hasAttribute(attr)) continue;

        const original = element.getAttribute(attr);
        const localized = this.localizeValue(original);

        if (localized !== original) {
          element.setAttribute(attr, localized);
          this.stats.attributesChanged += 1;
          this.stats.totalChanges += 1;

          this.logChange("attribute", original, localized, {
            attribute: attr,
            tag: element.tagName,
            path: this.getElementPath(element),
          });
        }
      }
    },

    processSplitPhraseElement(element) {
      if (this.shouldIgnoreElement(element)) return;

      const textNodes = this.getDirectTextNodes(element);
      if (textNodes.length < 2) return;

      if (this.hasNestedElementChildren(element)) return;

      const normalizedValues = textNodes.map((node) =>
        this.normalizeWhitespace(node.nodeValue),
      );

      const fullText = this.normalizeWhitespace(element.textContent);
      if (!fullText) return;

      const splitPhraseMeta = () => ({
        tag: element.tagName,
        path: this.getElementPath(element),
      });

      const singularOrPlural = (count, singular, plural) =>
        Number(count) === 1 ? singular : plural;

      const billingWeeksMatch = fullText.match(
        /^(Billed every|Alle)\s+(\d+)\s+(weeks?|Wochen)(?:\s+abgerechnet)?$/i,
      );

      if (billingWeeksMatch) {
        const prefixIndex = normalizedValues.findIndex((value) =>
          /^(Billed every|Alle)$/i.test(value),
        );

        const numberIndex = normalizedValues.findIndex((value) =>
          /^\d+$/.test(value),
        );

        const unitIndex = normalizedValues.findIndex((value) =>
          /^(weeks?|Wochen)(?:\s+abgerechnet)?$/i.test(value),
        );

        if (
          prefixIndex === -1 ||
          numberIndex === -1 ||
          unitIndex === -1 ||
          prefixIndex === numberIndex ||
          numberIndex === unitIndex
        ) {
          return;
        }

        let changed = false;

        changed =
          this.setNodeValueIfChanged(textNodes[prefixIndex], "Alle ") ||
          changed;

        changed =
          this.setNodeValueIfChanged(
            textNodes[unitIndex],
            ` ${singularOrPlural(billingWeeksMatch[2], "Woche", "Wochen")} abgerechnet`,
          ) || changed;

        this.markSplitPhraseChange(
          changed,
          fullText,
          this.normalizeWhitespace(element.textContent),
          splitPhraseMeta(),
        );
        return;
      }

      const billingDaysMatch = fullText.match(
        /^(Billed every|Alle)\s+(\d+)\s+(days?|Tage)(?:\s+abgerechnet)?$/i,
      );

      if (billingDaysMatch) {
        const prefixIndex = normalizedValues.findIndex((value) =>
          /^(Billed every|Alle)$/i.test(value),
        );

        const numberIndex = normalizedValues.findIndex((value) =>
          /^\d+$/.test(value),
        );

        const unitIndex = normalizedValues.findIndex((value) =>
          /^(days?|Tage)(?:\s+abgerechnet)?$/i.test(value),
        );

        if (
          prefixIndex === -1 ||
          numberIndex === -1 ||
          unitIndex === -1 ||
          prefixIndex === numberIndex ||
          numberIndex === unitIndex
        ) {
          return;
        }

        let changed = false;

        changed =
          this.setNodeValueIfChanged(textNodes[prefixIndex], "Alle ") ||
          changed;

        changed =
          this.setNodeValueIfChanged(
            textNodes[unitIndex],
            ` ${singularOrPlural(billingDaysMatch[2], "Tag", "Tage")} abgerechnet`,
          ) || changed;

        this.markSplitPhraseChange(
          changed,
          fullText,
          this.normalizeWhitespace(element.textContent),
          splitPhraseMeta(),
        );
        return;
      }

      const billingMonthsMatch = fullText.match(
        /^(Billed every|Alle)\s+(\d+)\s+(months?|Monate)(?:\s+abgerechnet)?$/i,
      );

      if (billingMonthsMatch) {
        const prefixIndex = normalizedValues.findIndex((value) =>
          /^(Billed every|Alle)$/i.test(value),
        );

        const numberIndex = normalizedValues.findIndex((value) =>
          /^\d+$/.test(value),
        );

        const unitIndex = normalizedValues.findIndex((value) =>
          /^(months?|Monate)(?:\s+abgerechnet)?$/i.test(value),
        );

        if (
          prefixIndex === -1 ||
          numberIndex === -1 ||
          unitIndex === -1 ||
          prefixIndex === numberIndex ||
          numberIndex === unitIndex
        ) {
          return;
        }

        let changed = false;

        changed =
          this.setNodeValueIfChanged(textNodes[prefixIndex], "Alle ") ||
          changed;

        changed =
          this.setNodeValueIfChanged(
            textNodes[unitIndex],
            ` ${singularOrPlural(billingMonthsMatch[2], "Monat", "Monate")} abgerechnet`,
          ) || changed;

        this.markSplitPhraseChange(
          changed,
          fullText,
          this.normalizeWhitespace(element.textContent),
          splitPhraseMeta(),
        );
        return;
      }

      const selectedFlavorsMatch = fullText.match(
        /^(You have selected|Du hast)\s+(\d+)\s+(of|von)\s+(\d+)\s+(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i,
      );

      if (selectedFlavorsMatch) {
        const numberIndexes = normalizedValues
          .map((value, index) => (/^\d+$/.test(value) ? index : -1))
          .filter((index) => index !== -1);

        if (numberIndexes.length < 2) return;

        let changed = false;

        textNodes.forEach((node, index) => {
          const value = this.normalizeWhitespace(node.nodeValue);

          if (/^(You have selected|Du hast)$/i.test(value)) {
            changed = this.setNodeValueIfChanged(node, "Du hast ") || changed;
            return;
          }

          if (/^(of|von)$/i.test(value)) {
            changed = this.setNodeValueIfChanged(node, " von ") || changed;
            return;
          }

          if (
            /^(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i.test(value)
          ) {
            changed =
              this.setNodeValueIfChanged(
                node,
                ` ${singularOrPlural(selectedFlavorsMatch[4], "Geschmacksrichtung", "Geschmacksrichtungen")} ausgewählt`,
              ) || changed;
            return;
          }

          if (!numberIndexes.includes(index)) {
            const localized = this.localizeValue(node.nodeValue);
            changed = this.setNodeValueIfChanged(node, localized) || changed;
          }
        });

        this.markSplitPhraseChange(
          changed,
          fullText,
          this.normalizeWhitespace(element.textContent),
          splitPhraseMeta(),
        );
      }
    },

    processSplitCurrencyElement(element) {
      if (this.shouldIgnoreElement(element)) return;

      const textNodes = this.getAllDirectTextNodes(element);
      if (textNodes.length < 2) return;

      const englishAmountPattern =
        /^-?(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)$/;

      const germanCurrencyPattern = /^-?\d{1,3}(?:\.\d{3})*,\d{2}\s*€$/;

      const values = textNodes.map((node) => node.nodeValue.trim());

      const markSplitCurrency = () => {
        element.setAttribute("data-stayai-split-currency", "true");
      };

      const formatAmountNode = (amountIndex, nodesToClear = []) => {
        const rawAmount = textNodes[amountIndex]?.nodeValue.trim();

        if (!rawAmount) return false;
        if (germanCurrencyPattern.test(rawAmount)) return false;
        if (!englishAmountPattern.test(rawAmount)) return false;

        const formatted = this.formatEuroAmount(rawAmount);
        if (!formatted) return false;

        const before = textNodes.map((node) => node.nodeValue).join("");

        for (const index of nodesToClear) {
          if (textNodes[index]) {
            textNodes[index].nodeValue = "";
          }
        }

        textNodes[amountIndex].nodeValue = formatted;
        markSplitCurrency();

        this.stats.splitCurrencyNodesChanged += 1;
        this.stats.totalChanges += 1;

        this.logChange("split-currency", before, formatted, {
          tag: element.tagName,
          path: this.getElementPath(element),
        });

        return true;
      };

      if (element.getAttribute("data-stayai-split-currency") === "true") {
        const amountIndex = values.findIndex((value) =>
          englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex);
        }

        return;
      }

      const euroIndex = values.findIndex((value) => value === "€");

      if (euroIndex !== -1) {
        const amountIndex = values.findIndex(
          (value, index) =>
            index !== euroIndex && englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex, [euroIndex]);
        }

        return;
      }

      const eurIndex = values.findIndex((value) => value === "EUR");

      if (eurIndex !== -1) {
        const amountIndex = values.findIndex(
          (value, index) =>
            index !== eurIndex && englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex, [eurIndex]);
        }
      }
    },

    processElement(element) {
      if (this.shouldIgnoreElement(element)) return;

      this.processAttributes(element);
      this.processSplitPhraseElement(element);
      this.processSplitCurrencyElement(element);
    },

    walk(root = this.config.root) {
      if (!root) return;

      if (root.nodeType === Node.TEXT_NODE) {
        this.processTextNode(root);
        return;
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        if (this.shouldIgnoreElement(root)) return;
        this.processElement(root);
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return this.shouldIgnoreElement(node)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT;
            }

            if (node.nodeType === Node.TEXT_NODE) {
              return node.nodeValue.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_REJECT;
          },
        },
      );

      let node;

      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.processTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          this.processElement(node);
        }
      }
    },

    run(root = this.config.root) {
      if (this.isRunning) {
        this.pendingRun = true;
        return this.report();
      }

      this.isRunning = true;

      const totalBefore = this.stats.totalChanges;
      let runNumber = this.stats.runs + 1;

      try {
        this.stats.runs += 1;
        runNumber = this.stats.runs;
        this.walk(root);
      } finally {
        this.isRunning = false;
      }

      const changesInRun = this.stats.totalChanges - totalBefore;

      if (changesInRun > 0) {
        this.stats.runsWithChanges += 1;
        this.logRunSummary(runNumber, changesInRun, root);
      }

      if (this.pendingRun) {
        this.pendingRun = false;
        this.scheduleRun();
      }

      return this.report();
    },

    scheduleRun() {
      const now = Date.now();

      if (!this.debounceStart) {
        this.debounceStart = now;
      }

      clearTimeout(this.debounceTimer);

      if (now - this.debounceStart >= this.config.maxWaitMs) {
        this.debounceStart = null;
        this.run(this.config.root);
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.debounceStart = null;
        this.run(this.config.root);
      }, this.config.debounceMs);
    },

    observe() {
      if (this.observer) return;

      this.observer = new MutationObserver((mutations) => {
        let needsFollowUpRun = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              this.run(node);

              if (node.nodeType === Node.ELEMENT_NODE) {
                this.processElement(node);

                if (node.parentElement) {
                  this.processElement(node.parentElement);
                }
              }
            }

            if (mutation.addedNodes.length > 0) {
              needsFollowUpRun = true;
            }
          }

          if (mutation.type === "attributes") {
            this.processAttributes(mutation.target);
            needsFollowUpRun = true;
          }

          if (mutation.type === "characterData") {
            const before = mutation.target.nodeValue;

            this.processTextNode(mutation.target);

            if (mutation.target.parentElement) {
              this.processElement(mutation.target.parentElement);
            }

            if (mutation.target.nodeValue !== before) {
              needsFollowUpRun = true;
            }
          }
        }

        if (needsFollowUpRun) {
          this.scheduleRun();
        }
      });

      this.observer.observe(this.config.root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: this.config.attributes,
        characterData: true,
      });

      console.log("[StayAI] MutationObserver active.");
    },

    installRouteHook() {
      if (this.routeHookInstalled) return;

      const rerunAfterRouteChange = () => {
        requestAnimationFrame(() => {
          this.run(this.config.root);
        });

        setTimeout(() => this.run(this.config.root), 100);
        setTimeout(() => this.run(this.config.root), 400);
        setTimeout(() => this.run(this.config.root), 1000);
      };

      const wrapHistoryMethod = (original) => {
        return (...args) => {
          const result = original.apply(history, args);
          rerunAfterRouteChange();
          return result;
        };
      };

      history.pushState = wrapHistoryMethod(history.pushState);
      history.replaceState = wrapHistoryMethod(history.replaceState);

      window.addEventListener("popstate", rerunAfterRouteChange);
      window.addEventListener("hashchange", rerunAfterRouteChange);

      this.routeHookInstalled = true;

      console.log("[StayAI] SPA route hook active.");
    },

    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      this.debounceStart = null;

      console.log("[StayAI] MutationObserver stopped.");
      return this.report();
    },

    restart() {
      this.stop();
      this.run(this.config.root);
      this.observe();
      this.installRouteHook();

      console.log("[StayAI] Localization restarted.");
      return this.report();
    },

    report() {
      return { ...this.stats };
    },

    resetStats() {
      this.stats = {
        runs: 0,
        runsWithChanges: 0,
        textNodesChanged: 0,
        attributesChanged: 0,
        splitCurrencyNodesChanged: 0,
        splitPhraseElementsChanged: 0,
        totalChanges: 0,
        runtimeTranslationsAdded: 0,
        runtimeTranslationsRemoved: 0,
      };
      this.clearChangeLog();

      return this.report();
    },
  };

  window.StayAILocalization = StayAILocalization;

  const antiFlicker = document.createElement("style");
  antiFlicker.textContent = "body{visibility:hidden!important}";
  document.head.appendChild(antiFlicker);

  try {
    StayAILocalization.run();
  } catch (error) {
    console.error("[StayAI] Initial localization failed.", error);
  } finally {
    antiFlicker.remove();
  }

  StayAILocalization.observe();
  StayAILocalization.installRouteHook();

  console.table([StayAILocalization.report()]);
  console.log(
    "[StayAI] Localization injection active.",
    StayAILocalization.report(),
  );

  console.log(
    "[StayAI] Runtime API available: addTranslation, addTranslations, removeTranslation, listTranslations, showChangeLog, clearChangeLog, setDebug, setConsoleLogging, run, stop, restart, report.",
  );

  return StayAILocalization.report();
})();
