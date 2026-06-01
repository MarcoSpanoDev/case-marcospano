/**
 * Debug and reporting API.
 *
 * Provides change logging, run summaries, statistics, debug toggles and
 * helper methods for inspecting what the localization script changed.
 */
export function createDebugApi(app) {
  return {
    /**
     * Builds a short readable DOM path for logs.
     *
     * The path is intentionally limited to a few parent elements so logs stay
     * useful without becoming too long or noisy.
     */
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

        // Prefer IDs because they are usually the most specific selector part.
        if (current.id) {
          part += `#${current.id}`;
          parts.unshift(part);
          break;
        }

        // Include only the first two classes to keep the log output readable.
        if (current.classList?.length) {
          part += `.${[...current.classList].slice(0, 2).join(".")}`;
        }

        parts.unshift(part);
        current = current.parentElement;
      }

      return parts.join(" > ");
    },

    /**
     * Stores one localization change in the in-memory change log.
     *
     * This is mainly used for debugging and for proving what the script changed
     * during manual testing.
     */
    logChange(type, before, after, meta = {}) {
      if (!app.config.debug) return;

      const entry = {
        index: app.changeLog.length + 1,
        type,
        before,
        after,
        ...meta,
        timestamp: new Date().toISOString(),
      };

      app.changeLog.push(entry);

      // Keep the log bounded so long test sessions do not grow memory forever.
      if (app.changeLog.length > app.config.logLimit) {
        app.changeLog.shift();
      }

      if (app.config.logToConsole) {
        console.info(`[StayAI] Changed ${type}`, {
          before,
          after,
          ...meta,
        });
      }
    },

    /**
     * Prints a compact summary after a run that made changes.
     *
     * This avoids flooding the console while still showing when localization
     * actually changed the DOM.
     */
    logRunSummary(runNumber, changes, root) {
      if (!app.config.debug || !app.config.logRunSummary || !changes) return;

      const rootLabel =
        root?.nodeType === Node.ELEMENT_NODE
          ? app.getElementPath(root)
          : root?.nodeType === Node.TEXT_NODE
            ? `text node inside ${app.getElementPath(root.parentElement)}`
            : "unknown root";

      console.info(`[StayAI] Run ${runNumber} completed`, {
        changes,
        root: rootLabel,
        stats: app.report(),
      });
    },

    /**
     * Shows all recorded changes as a console table.
     *
     * Useful after testing a page flow to inspect exactly which text nodes,
     * attributes or split values were changed.
     */
    showChangeLog() {
      console.table(app.changeLog);
      return [...app.changeLog];
    },

    /**
     * Clears the in-memory change log without resetting the full statistics.
     */
    clearChangeLog() {
      app.changeLog = [];
      console.log("[StayAI] Change log cleared.");
      return [];
    },

    /**
     * Enables or disables all debug behavior.
     */
    setDebug(enabled) {
      app.config.debug = Boolean(enabled);

      console.log(
        `[StayAI] Debug logging ${app.config.debug ? "enabled" : "disabled"}.`,
      );

      return app.report();
    },

    /**
     * Enables or disables per-change console logs.
     *
     * This is separate from debug mode so detailed logs can be reduced while
     * keeping summary/stat reporting available.
     */
    setConsoleLogging(enabled) {
      app.config.logToConsole = Boolean(enabled);

      console.log(
        `[StayAI] Per-change console logging ${
          app.config.logToConsole ? "enabled" : "disabled"
        }.`,
      );

      return app.report();
    },

    /**
     * Returns a shallow copy of the current statistics.
     *
     * A copy is returned so callers cannot accidentally mutate the internal
     * stats object directly.
     */
    report() {
      return { ...app.stats };
    },

    /**
     * Resets all counters and clears the change log.
     *
     * Useful before a clean demo run or when comparing behavior between pages.
     */
    resetStats() {
      app.stats = {
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

      app.clearChangeLog();

      return app.report();
    },
  };
}
