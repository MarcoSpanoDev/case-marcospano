/**
 * MutationObserver and lifecycle API.
 *
 * Watches for dynamically inserted or changed DOM content, schedules debounced
 * follow-up runs and provides stop/restart behavior for repeated console tests.
 */
export function createObserverApi(app) {
  return {
    /**
     * Schedules a debounced localization run.
     *
     * This prevents the script from running too often while React/StayAI is
     * rendering many DOM updates in quick succession.
     *
     * maxWaitMs ensures that continuous mutations still trigger a run after a
     * maximum waiting time.
     */
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

    /**
     * Starts observing the
     * This keeps the localization active after the initial run, especially for:
     * - dynamically inserted elements
     * - React text updates
     * - changed accessibility attributes
     * - lazy-loaded UI content
     */
    observe() {
      if (app.observer || !app.config.root) return;

      app.observer = new MutationObserver((mutations) => {
        let needsFollowUpRun = false;

        for (const mutation of mutations) {
          /**
           * Handles newly inserted DOM nodes.
           *
           * app.run(node) localizes the new subtree immediately.
           * processElement(parentElement) is used because split text-node cases
           * sometimes only become detectable from the parent element.
           */
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

          /**
           * Handles changed attributes such as aria-label, title or placeholder.
           *
           * This matters because some UI text is not stored as visible text,
           * but inside attributes used for accessibility or tooltips.
           */
          if (mutation.type === "attributes") {
            app.processAttributes(mutation.target);
            needsFollowUpRun = true;
          }

          /**
           * Handles text changes inside existing text nodes.
           *
           * This is important when React updates dynamic values without adding a
           * new element, for example changing a price or billing interval.
           */
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

        /**
         * A follow-up run catches DOM changes that happen shortly after the
         * first mutation batch, for example lazy-loaded or multi-step renders.
         */
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

    /**
     * Stops all active localization behavior.
     *
     * This is useful during console testing because the script can be stopped,
     * changed and restarted without refreshing the page.
     */
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

    /**
     * Fully restarts localization.
     *
     * This runs localization once, starts the MutationObserver again and
     * reinstalls the route hook if available.
     */
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
