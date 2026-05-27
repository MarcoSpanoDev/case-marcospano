// src/core/observer.js

export function createObserverApi(app) {
  return {
    scheduleRun() {
      const now = Date.now();

      if (!app.debounceStart) {
        app.debounceStart = now;
      }

      clearTimeout(app.debounceTimer);

      if (now - app.debounceStart >= app.config.maxWaitMs) {
        app.debounceStart = null;
        app.run(app.config.root);
        return;
      }

      app.debounceTimer = setTimeout(() => {
        app.debounceStart = null;
        app.run(app.config.root);
      }, app.config.debounceMs);
    },

    observe() {
      if (app.observer || !app.config.root) return;

      app.observer = new MutationObserver((mutations) => {
        let needsFollowUpRun = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              app.run(node);

              if (node.nodeType === Node.ELEMENT_NODE && node.parentElement) {
                app.processElement(node.parentElement);
              }
            }

            if (mutation.addedNodes.length > 0) {
              needsFollowUpRun = true;
            }
          }

          if (mutation.type === "attributes") {
            app.processAttributes(mutation.target);
            needsFollowUpRun = true;
          }

          if (mutation.type === "characterData") {
            const before = mutation.target.nodeValue;

            app.processTextNode(mutation.target);

            if (mutation.target.parentElement) {
              app.processElement(mutation.target.parentElement);
            }

            if (mutation.target.nodeValue !== before) {
              needsFollowUpRun = true;
            }
          }
        }

        if (needsFollowUpRun) {
          app.scheduleRun();
        }
      });

      app.observer.observe(app.config.root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: app.config.attributes,
        characterData: true,
      });

      console.log("[StayAI] MutationObserver active.");
    },

    stop() {
      if (app.routeHandler) {
        window.removeEventListener("popstate", app.routeHandler);
        window.removeEventListener("hashchange", app.routeHandler);
        app.routeHandler = null;
      }

      if (app.restoreOriginalHistory) {
        app.restoreOriginalHistory();
      }

      app.routeHookInstalled = false;
      app.pendingRun = false;
      app.isRunning = false;

      if (app.observer) {
        app.observer.disconnect();
        app.observer = null;
      }

      clearTimeout(app.debounceTimer);
      app.debounceTimer = null;
      app.debounceStart = null;

      console.log("[StayAI] Localization stopped.");

      return app.report();
    },

    restart() {
      app.stop();
      app.run(app.config.root);
      app.observe();

      if (app.installRouteHook) {
        app.installRouteHook();
      }

      console.log("[StayAI] Localization restarted.");

      return app.report();
    },
  };
}
