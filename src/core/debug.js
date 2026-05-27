// src/core/debug.js

export function createDebugApi(app) {
  return {
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

    showChangeLog() {
      console.table(app.changeLog);
      return [...app.changeLog];
    },

    clearChangeLog() {
      app.changeLog = [];
      console.log("[StayAI] Change log cleared.");
      return [];
    },

    setDebug(enabled) {
      app.config.debug = Boolean(enabled);

      console.log(
        `[StayAI] Debug logging ${app.config.debug ? "enabled" : "disabled"}.`,
      );

      return app.report();
    },

    setConsoleLogging(enabled) {
      app.config.logToConsole = Boolean(enabled);

      console.log(
        `[StayAI] Per-change console logging ${
          app.config.logToConsole ? "enabled" : "disabled"
        }.`,
      );

      return app.report();
    },

    report() {
      return { ...app.stats };
    },

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
