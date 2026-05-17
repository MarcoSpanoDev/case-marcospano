(() => {
  "use strict";

  const StayAILocalization = {
    // ─── State ───────────────────────────────────────────────────────────────

    observer: null,
    debounceTimer: null,
    debounceStart: null, // tracks when the current debounce window opened (for maxWait)
    isRunning: false,
    pendingRun: false, // queues a follow-up run if one was requested during isRunning
    routeHookInstalled: false,
    compiledPatterns: null, // pre-compiled translation patterns (built lazily)

    stats: {
      runs: 0,
      textNodesChanged: 0,
      attributesChanged: 0,
      splitCurrencyNodesChanged: 0,
      totalChanges: 0,
    },

    // ─── Config ───────────────────────────────────────────────────────────────

    config: {
      root: document.body,
      debounceMs: 50,
      maxWaitMs: 1000, // force a run after this long even if mutations keep firing
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

    // ─── Translations ─────────────────────────────────────────────────────────

    translations: new Map([
      // --- Navigation & UI ---
      ["Notifications (F8)", "Benachrichtigungen (F8)"],

      // --- Subscription states ---
      ["Active", "Aktiv"],
      ["Paused", "Pausiert"],
      ["Skipped", "Übersprungen"],

      // --- Subscription labels ---
      ["New Abonnement", "Neues Abonnement"],
      ["Paused Abonnements", "Pausierte Abonnements"],
      ["Subscriptions", "Abonnements"],
      ["Subscription", "Abonnement"],

      // --- Subscription detail lines ---
      ["Started on", "Gestartet am"],
      ["Selected flavors: (", "Ausgewählte Geschmacksrichtungen: ("],
      ["flavors for", "Geschmacksrichtungen für"],

      // --- Next-delivery variants
      // NOTE: "Weiter delivery:" is a known typo in the StayAI UI — kept intentionally
      ["Weiter delivery:", "Nächste Lieferung:"],
      ["Next delivery:", "Nächste Lieferung:"],

      // --- Skip / pause status lines ---
      ["Skipped until", "Übersprungen bis"],
      ["Paused until", "Pausiert bis"],

      // --- Frequency units ---
      ["Every", "Alle"],
      ["week", "Woche"],
      ["weeks", "Wochen"],
      ["day", "Tag"],
      ["days", "Tage"],
      ["month", "Monat"],
      ["months", "Monate"],

      // --- Common actions ---
      ["Skip next", "Nächste überspringen"],
      ["Unskip", "Überspringen aufheben"],
      ["Resume", "Fortsetzen"],
      ["Edit", "Bearbeiten"],
      ["Remove", "Entfernen"],
      ["Manage", "Verwalten"],

      // --- Order / account labels ---
      ["Order history", "Bestellverlauf"],
      ["Next order", "Nächste Bestellung"],
      ["Shipping address", "Lieferadresse"],
      ["Payment method", "Zahlungsmethode"],
      ["Quantity", "Menge"],
      ["Frequency", "Häufigkeit"],
    ]),

    // ─── Date helpers ─────────────────────────────────────────────────────────

    monthTranslations: new Map([
      ["Jan", "Jan."],
      ["January", "Januar"],
      ["Feb", "Feb."],
      ["February", "Februar"],
      ["Mar", "März"],
      ["March", "März"],
      ["Apr", "Apr."],
      ["April", "April"],
      ["May", "Mai"], // only used inside date-regex context — no standalone risk
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

    // ─── Formatters ───────────────────────────────────────────────────────────

    euroFormatter: new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }),

    // ─── Regex helpers ────────────────────────────────────────────────────────

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
      return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    preserveOuterWhitespace(original, replacement) {
      const leading = original.match(/^\s*/)?.[0] ?? "";
      const trailing = original.match(/\s*$/)?.[0] ?? "";
      return `${leading}${replacement}${trailing}`;
    },

    makeTranslationPattern(source) {
      const escaped = this.escapeRegExp(source);
      // Word-boundary guards only for purely alphabetic keys — prevents
      // partial matches inside compound words while still catching "day" in
      // "every 3 days" without needing special-casing.
      return /^[A-Za-z]+$/.test(source)
        ? new RegExp(`\\b${escaped}\\b`, "g")
        : new RegExp(escaped, "g");
    },

    /**
     * Lazily builds and caches pre-compiled patterns sorted longest-first
     * so longer phrases always win over their shorter substrings.
     */
    getCompiledPatterns() {
      if (this.compiledPatterns) return this.compiledPatterns;

      this.compiledPatterns = [...this.translations.entries()]
        .sort(([a], [b]) => b.length - a.length)
        .map(([source, target]) => ({
          pattern: this.makeTranslationPattern(source),
          target,
        }));

      return this.compiledPatterns;
    },

    // ─── Localization pipeline ────────────────────────────────────────────────

    applyTranslations(value) {
      const normalized = this.normalizeWhitespace(value);

      // Fast path: exact full-string match
      if (this.translations.has(normalized)) {
        return this.preserveOuterWhitespace(
          value,
          this.translations.get(normalized),
        );
      }

      // Partial replacements — longest patterns first (cached)
      let result = value;
      for (const { pattern, target } of this.getCompiledPatterns()) {
        // Reset lastIndex before each use (patterns are reused across calls)
        pattern.lastIndex = 0;
        result = result.replace(pattern, target);
      }
      return result;
    },

    formatDateFragments(value) {
      let result = value;

      // "5 Jan" / "5 January" → "5. Jan."
      result = result.replace(
        /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g,
        (match, day, month) => {
          const translated = this.monthTranslations.get(month);
          return translated ? `${day}. ${translated}` : match;
        },
      );

      // "January 5, 2024" → "05.01.2024"
      result = result.replace(
        /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s*(\d{4})\b/g,
        (match, month, day, year) => {
          const num = this.monthNumbers.get(month);
          return num ? `${String(day).padStart(2, "0")}.${num}.${year}` : match;
        },
      );

      // "Monday, 05.01.2024" → "Montag, 05.01.2024"
      // Runs after date conversion above so "Weekday, DD.MM.YYYY" is always in German date format
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

      // "2:30 PM" / "02:30 PM" -> "14:30 Uhr"
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

      // "2 PM" -> "14:00 Uhr"
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
      // Strip English thousands separator (comma), keep decimal dot
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
      // Single combined pattern — one pass prevents step N+1 from re-processing
      // output that step N just produced (the root cause of "89,92,00 €").
      //
      // Amount alternatives (English-format only, so already-German output is safe):
      //   \d{1,3}(?:,\d{3})+(?:\.\d{1,2})?  →  1,234  /  1,234.56
      //   \d+\.\d{1,2}                        →  89.92
      //   \d+                                 →  89
      // (?<![,.\d]) — negative lookbehind prevents matching "92" inside "89,92 €"
      const a =
        "-?(?<![,.\\d])(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+)";
      const pattern = new RegExp(
        `€\\s*(${a})|(${a})\\s*€|(${a})\\s*EUR\\b|\\bEUR\\s*(${a})`,
        "g",
      );

      return value.replace(pattern, (match, g1, g2, g3, g4) => {
        const raw = g1 ?? g2 ?? g3 ?? g4;
        return this.formatEuroAmount(raw) ?? match;
      });
    },

    localizeValue(value) {
      let result = value;
      result = this.applyTranslations(result);
      result = this.formatDateFragments(result);
      result = this.formatCurrencyFragments(result);
      result = this.formatTimeFragments(result);

      return result;
    },

    // ─── DOM processing ───────────────────────────────────────────────────────

    processTextNode(node) {
      if (this.shouldIgnoreElement(node.parentElement)) return;

      const original = node.nodeValue;
      const localized = this.localizeValue(original);

      if (localized !== original) {
        node.nodeValue = localized;
        this.stats.textNodesChanged += 1;
        this.stats.totalChanges += 1;
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
        }
      }
    },

    getDirectTextNodes(element) {
      return [...element.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim(),
      );
    },

    /**
     * Handles cases where a currency value is split across multiple text nodes
     * within one element, e.g. <span>€<strong/></span><span>19.99</span>.
     * Combines all direct text nodes, checks if they form a valid currency
     * string, then rewrites only the first node and blanks the rest.
     */
    processSplitCurrencyElement(element) {
      if (this.shouldIgnoreElement(element)) return;

      const textNodes = this.getDirectTextNodes(element);
      if (textNodes.length < 2) return;

      const combined = textNodes.map((n) => n.nodeValue.trim()).join("");
      const amountPat =
        "(-?(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+))";

      const match =
        combined.match(new RegExp(`^€${amountPat}$`)) ||
        combined.match(new RegExp(`^${amountPat}€$`)) ||
        combined.match(new RegExp(`^${amountPat}\\s*EUR$`)) ||
        combined.match(new RegExp(`^EUR\\s*${amountPat}$`));

      if (!match) return;

      const formatted = this.formatEuroAmount(match[1]);
      if (!formatted) return;

      textNodes[0].nodeValue = formatted;
      for (let i = 1; i < textNodes.length; i++) {
        textNodes[i].nodeValue = "";
      }

      this.stats.splitCurrencyNodesChanged += 1;
      this.stats.totalChanges += 1;
    },

    walk(root = this.config.root) {
      if (!root) return;

      if (root.nodeType === Node.TEXT_NODE) {
        this.processTextNode(root);
        return;
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        if (this.shouldIgnoreElement(root)) return;
        this.processAttributes(root);
        this.processSplitCurrencyElement(root);
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
          this.processAttributes(node);
          this.processSplitCurrencyElement(node);
        }
      }
    },

    // ─── Run control ──────────────────────────────────────────────────────────

    run(root = this.config.root) {
      // If already running, remember that another pass is needed afterwards
      if (this.isRunning) {
        this.pendingRun = true;
        return this.report();
      }

      this.isRunning = true;

      try {
        this.stats.runs += 1;
        this.walk(root);
      } finally {
        this.isRunning = false;
      }

      // A mutation arrived while we were running — schedule a follow-up
      if (this.pendingRun) {
        this.pendingRun = false;
        this.scheduleRun();
      }

      return this.report();
    },

    scheduleRun() {
      const now = Date.now();

      // Record when this debounce window opened
      if (!this.debounceStart) this.debounceStart = now;

      clearTimeout(this.debounceTimer);

      // If mutations have been firing continuously for maxWaitMs, run now
      // instead of waiting forever for a quiet moment
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

    // ─── MutationObserver ─────────────────────────────────────────────────────

    observe() {
      if (this.observer) return;

      this.observer = new MutationObserver((mutations) => {
        let needsFollowUpRun = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              this.run(node);
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

            if (mutation.target.nodeValue !== before) {
              needsFollowUpRun = true;
            }
          }
        }

        // Follow-up for content that is inserted in multiple render phases.
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

    // ─── SPA route hook ───────────────────────────────────────────────────────

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
      const wrap =
        (original) =>
        (...args) => {
          const result = original.apply(history, args);
          rerunAfterRouteChange();
          return result;
        };

      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
      window.addEventListener("popstate", rerunAfterRouteChange);
      window.addEventListener("hashchange", rerunAfterRouteChange); // hash-based routers

      this.routeHookInstalled = true;
      console.log("[StayAI] SPA route hook active.");
    },

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      console.log("[StayAI] MutationObserver stopped.");
    },

    report() {
      return { ...this.stats };
    },

    resetStats() {
      this.stats = {
        runs: 0,
        textNodesChanged: 0,
        attributesChanged: 0,
        splitCurrencyNodesChanged: 0,
        totalChanges: 0,
      };
      return this.report();
    },
  };

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  window.StayAILocalization = StayAILocalization;

  // Anti-FOUC: hide the body immediately so untranslated content never flashes.
  // The style is removed synchronously after the first translation run.
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

  return StayAILocalization.report();
})();
