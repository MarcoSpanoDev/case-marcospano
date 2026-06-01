/**
 * Core localization API.
 *
 * Applies dynamic phrase rules, static translations, date formatting,
 * currency formatting and time formatting. Also exposes runtime translation
 * management and the main run() method.
 */
export function createLocalizationApi(app) {
  return {
    /**
     * Clears compiled translation regex patterns.
     *
     * This is required whenever translations are added or removed at runtime,
     * otherwise the localization pipeline would still use outdated patterns.
     */
    invalidateTranslationCache() {
      app.compiledPatterns = null;
    },

    /**
     * Adds a single translation during runtime and immediately re-runs
     * localization on the configured root element.
     */
    addTranslation(source, target) {
      if (!source || !target) {
        console.warn("[StayAI] addTranslation requires source and target.");
        return app.report();
      }

      app.translations.set(String(source), String(target));
      app.stats.runtimeTranslationsAdded += 1;
      app.invalidateTranslationCache();

      console.log(`[StayAI] Translation added: "${source}" -> "${target}"`);

      return app.run(app.config.root);
    },

    /**
     * Adds multiple translations during runtime.
     *
     * Expected format:
     * {
     *   "Subscriptions": "Abonnements",
     *   "Next order": "Nächste Bestellung"
     * }
     */
    addTranslations(entries) {
      if (!entries || typeof entries !== "object") {
        console.warn("[StayAI] addTranslations requires an object.");
        return app.report();
      }

      let added = 0;

      for (const [source, target] of Object.entries(entries)) {
        if (!source || !target) continue;

        app.translations.set(String(source), String(target));
        added += 1;
      }

      app.stats.runtimeTranslationsAdded += added;
      app.invalidateTranslationCache();

      console.log(`[StayAI] ${added} translation(s) added.`);

      return app.run(app.config.root);
    },

    /**
     * Removes a runtime translation and refreshes the DOM afterwards.
     */
    removeTranslation(source) {
      if (!source) {
        console.warn("[StayAI] removeTranslation requires a source string.");
        return app.report();
      }

      const removed = app.translations.delete(String(source));

      if (removed) {
        app.stats.runtimeTranslationsRemoved += 1;
        app.invalidateTranslationCache();

        console.log(`[StayAI] Translation removed: "${source}"`);

        return app.run(app.config.root);
      }

      console.warn(`[StayAI] No translation found for: "${source}"`);

      return app.report();
    },

    /**
     * Prints the current translation map as a table.
     *
     * Useful for debugging and for checking which translations are currently
     * active after runtime additions or removals.
     */
    listTranslations() {
      const entries = [...app.translations.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([source, target]) => ({ source, target }));

      console.table(entries);

      return entries;
    },

    hasTranslation(source) {
      return app.translations.has(String(source));
    },

    getTranslation(source) {
      return app.translations.get(String(source));
    },

    /**
     * Creates a safe regex pattern for one translation source.
     *
     * Single words get word boundaries so words like "day" do not accidentally
     * match inside unrelated longer words.
     */
    makeTranslationPattern(source) {
      const escaped = app.escapeRegExp(source);

      if (/^[A-Za-z]+$/.test(source)) {
        return new RegExp(`\\b${escaped}\\b`, "g");
      }

      return new RegExp(escaped, "g");
    },

    /**
     * Compiles all translations into regex patterns.
     *
     * Longer source strings are processed first. This prevents shorter entries
     * from partially replacing text before a more specific phrase can match.
     *
     * Example:
     * "Next order date" should be handled before "Next order".
     */
    getCompiledPatterns() {
      if (app.compiledPatterns) return app.compiledPatterns;

      app.compiledPatterns = [...app.translations.entries()]
        .sort(([a], [b]) => b.length - a.length)
        .map(([source, target]) => ({
          source,
          target,
          pattern: app.makeTranslationPattern(source),
        }));

      return app.compiledPatterns;
    },

    /**
     * Handles dynamic phrases that cannot be covered well by static mappings.
     *
     * These strings contain changing numbers, for example selected flavor counts
     * or billing intervals. Regex replacement keeps the numeric values dynamic.
     */
    applyDynamicPhraseRules(value) {
      let result = value;

      result = result.replace(
        /\bYou have selected\s+(\d+)\s+of\s+(\d+)\s+flavors\b/gi,
        "Du hast $1 von $2 Geschmacksrichtungen ausgewählt",
      );

      result = result.replace(
        /\bBilled every\s+(\d+)\s+(weeks?|days?|months?)\b/gi,
        (match, count, unit) => {
          const normalizedUnit = unit.toLowerCase();

          if (normalizedUnit.startsWith("week")) {
            return `Alle ${count} ${
              Number(count) === 1 ? "Woche" : "Wochen"
            } abgerechnet`;
          }

          if (normalizedUnit.startsWith("day")) {
            return `Alle ${count} ${
              Number(count) === 1 ? "Tag" : "Tage"
            } abgerechnet`;
          }

          return `Alle ${count} ${
            Number(count) === 1 ? "Monat" : "Monate"
          } abgerechnet`;
        },
      );

      return result;
    },

    /**
     * Applies static translations.
     *
     * First, an exact normalized lookup is attempted. This preserves outer
     * whitespace and avoids unnecessary regex work.
     *
     * If no exact match exists, compiled regex patterns are applied for partial
     * phrase replacements.
     */
    applyTranslations(value) {
      const normalized = app.normalizeWhitespace(value);

      if (app.translations.has(normalized)) {
        return app.preserveOuterWhitespace(
          value,
          app.translations.get(normalized),
        );
      }

      let result = value;

      for (const { pattern, target } of app.getCompiledPatterns()) {
        pattern.lastIndex = 0;
        result = result.replace(pattern, target);
      }

      return result;
    },

    /**
     * Main localization pipeline for one string value.
     *
     * Order matters:
     * 1. Dynamic phrase rules
     * 2. Static translations
     * 3. Date formatting
     * 4. Currency formatting
     * 5. Time formatting
     *
     * This keeps text translation and format normalization in one predictable
     * processing path.
     */
    localizeValue(value) {
      let result = value;

      result = app.applyDynamicPhraseRules(result);
      result = app.applyTranslations(result);
      result = app.formatDateFragments(result);
      result = app.formatCurrencyFragments(result);
      result = app.formatTimeFragments(result);

      return result;
    },

    /**
     * Records split-phrase changes in one central place.
     *
     * Split phrases are handled in the DOM API because they depend on text-node
     * layout, but their stats and logging still belong to the localization flow.
     */
    markSplitPhraseChange(changed, before = null, after = null, meta = {}) {
      if (!changed) return;

      app.stats.splitPhraseElementsChanged += 1;
      app.stats.totalChanges += 1;

      app.logChange("split-phrase", before, after, meta);
    },

    /**
     * Runs localization on the provided root element.
     *
     * The isRunning/pendingRun guard prevents overlapping DOM walks. If a new
     * run is requested while another run is active, it is queued and scheduled
     * after the current run finishes.
     */
    run(root = app.config.root) {
      if (app.isRunning) {
        app.pendingRun = true;
        return app.report();
      }

      app.isRunning = true;

      const totalBefore = app.stats.totalChanges;
      let runNumber = app.stats.runs + 1;

      try {
        app.stats.runs += 1;
        runNumber = app.stats.runs;
        app.walk(root);
      } finally {
        app.isRunning = false;
      }

      const changesInRun = app.stats.totalChanges - totalBefore;

      if (changesInRun > 0) {
        app.stats.runsWithChanges += 1;
        app.logRunSummary(runNumber, changesInRun, root);
      }

      if (app.pendingRun) {
        app.pendingRun = false;
        app.scheduleRun();
      }

      return app.report();
    },
  };
}
