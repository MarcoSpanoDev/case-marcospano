// src/core/localization.js

export function createLocalizationApi(app) {
  return {
    invalidateTranslationCache() {
      app.compiledPatterns = null;
    },

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

    makeTranslationPattern(source) {
      const escaped = app.escapeRegExp(source);

      if (/^[A-Za-z]+$/.test(source)) {
        return new RegExp(`\\b${escaped}\\b`, "g");
      }

      return new RegExp(escaped, "g");
    },

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

    localizeValue(value) {
      let result = value;

      result = app.applyDynamicPhraseRules(result);
      result = app.applyTranslations(result);
      result = app.formatDateFragments(result);
      result = app.formatCurrencyFragments(result);
      result = app.formatTimeFragments(result);

      return result;
    },

    markSplitPhraseChange(changed, before = null, after = null, meta = {}) {
      if (!changed) return;

      app.stats.splitPhraseElementsChanged += 1;
      app.stats.totalChanges += 1;

      app.logChange("split-phrase", before, after, meta);
    },

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
