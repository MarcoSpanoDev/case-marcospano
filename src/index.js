import { config } from "./config.js";
import { createDebugApi } from "./core/debug.js";
import { createDomApi } from "./core/dom.js";
import { createLocalizationApi } from "./core/localization.js";
import { createObserverApi } from "./core/observer.js";
import { createRouteHookApi } from "./core/routeHook.js";
import { TRANSLATION_GROUPS, createTranslationMap } from "./translation.js";

import { formatDateFragments } from "./formatters/date.js";
import { formatTimeFragments } from "./formatters/times.js";
import {
  formatCurrencyFragments,
  formatEuroAmount,
} from "./formatters/currency.js";

(() => {
  "use strict";

  const GLOBAL_KEY = "__StayAILocalizationOriginalHistory__";

  if (!window[GLOBAL_KEY]) {
    window[GLOBAL_KEY] = {
      pushState: history.pushState,
      replaceState: history.replaceState,
    };
  }

  if (window.StayAILocalization?.stop) {
    window.StayAILocalization.stop();
  }

  const StayAILocalization = {
    observer: null,
    debounceTimer: null,
    debounceStart: null,
    isRunning: false,
    pendingRun: false,
    routeHookInstalled: false,
    routeHandler: null,
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

    config,

    translationGroups: TRANSLATION_GROUPS,
    translations: createTranslationMap(TRANSLATION_GROUPS),

    formatDateFragments,
    formatTimeFragments,
    formatCurrencyFragments,
    formatEuroAmount,
  };

  Object.assign(
    StayAILocalization,
    createDebugApi(StayAILocalization),
    createDomApi(StayAILocalization),
    createLocalizationApi(StayAILocalization),
    createObserverApi(StayAILocalization),
    createRouteHookApi(StayAILocalization, GLOBAL_KEY),
  );

  window.StayAILocalization = StayAILocalization;

  const antiFlicker = document.createElement("style");

  try {
    antiFlicker.textContent = "body{visibility:hidden!important}";
    document.head?.appendChild(antiFlicker);

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
