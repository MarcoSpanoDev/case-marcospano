/**
 * SPA route hook API.
 *
 * Hooks into history.pushState, history.replaceState, popstate and hashchange
 * so localization reruns after internal route changes in the StayAI portal.
 */
export function createRouteHookApi(app, globalKey) {
  return {
    /**
     * Restores the original browser history methods.
     *
     * This is important for repeated console testing because pushState and
     * replaceState are monkey-patched when the route hook is installed.
     */
    restoreOriginalHistory() {
      if (!window[globalKey]) return;

      history.pushState = window[globalKey].pushState;
      history.replaceState = window[globalKey].replaceState;
    },

    /**
     * Installs hooks for SPA navigation.
     *
     * StayAI behaves like a single-page application, so internal navigation does
     * not always trigger a full page reload. Without this hook, translated text
     * could disappear after switching pages because React renders new DOM nodes.
     */
    installRouteHook() {
      if (app.routeHookInstalled) return;

      const originalHistory = window[globalKey];

      /**
       * Runs localization after a route change.
       *
       * requestAnimationFrame handles the next browser render cycle immediately.
       * The delayed follow-up runs catch content that appears slightly later,
       * for example lazy-loaded sections or async React updates.
       */
      app.routeHandler = () => {
        requestAnimationFrame(() => {
          app.run(app.config.root);
        });

        setTimeout(() => app.run(app.config.root), 100);
        setTimeout(() => app.run(app.config.root), 400);
        setTimeout(() => app.run(app.config.root), 1000);
      };

      /**
       * Wraps history methods so every programmatic SPA navigation also triggers
       * localization after the original navigation behavior completes.
       */
      const wrapHistoryMethod = (original) => {
        return (...args) => {
          const result = original.apply(history, args);
          app.routeHandler();
          return result;
        };
      };

      history.pushState = wrapHistoryMethod(originalHistory.pushState);
      history.replaceState = wrapHistoryMethod(originalHistory.replaceState);

      /**
       * Also listen to browser-driven navigation events.
       *
       * popstate covers back/forward navigation.
       * hashchange covers URL hash based route changes.
       */
      window.addEventListener("popstate", app.routeHandler);
      window.addEventListener("hashchange", app.routeHandler);

      app.routeHookInstalled = true;

      console.log("[StayAI] SPA route hook active.");
    },
  };
}
