// src/core/routeHook.js

export function createRouteHookApi(app, globalKey) {
  return {
    restoreOriginalHistory() {
      if (!window[globalKey]) return;

      history.pushState = window[globalKey].pushState;
      history.replaceState = window[globalKey].replaceState;
    },

    installRouteHook() {
      if (app.routeHookInstalled) return;

      const originalHistory = window[globalKey];

      app.routeHandler = () => {
        requestAnimationFrame(() => {
          app.run(app.config.root);
        });

        setTimeout(() => app.run(app.config.root), 100);
        setTimeout(() => app.run(app.config.root), 400);
        setTimeout(() => app.run(app.config.root), 1000);
      };

      const wrapHistoryMethod = (original) => {
        return (...args) => {
          const result = original.apply(history, args);
          app.routeHandler();
          return result;
        };
      };

      history.pushState = wrapHistoryMethod(originalHistory.pushState);
      history.replaceState = wrapHistoryMethod(originalHistory.replaceState);

      window.addEventListener("popstate", app.routeHandler);
      window.addEventListener("hashchange", app.routeHandler);

      app.routeHookInstalled = true;

      console.log("[StayAI] SPA route hook active.");
    },
  };
}
