(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/config.js
  var config;
  var init_config = __esm({
    "src/config.js"() {
      config = {
        root: document.body || document.documentElement,
        debounceMs: 50,
        maxWaitMs: 1e3,
        debug: false,
        logToConsole: true,
        logRunSummary: true,
        logLimit: 150,
        attributes: ["placeholder", "title", "aria-label", "alt"],
        ignoredTags: /* @__PURE__ */ new Set([
          "SCRIPT",
          "STYLE",
          "NOSCRIPT",
          "IFRAME",
          "SVG",
          "CANVAS",
          "TEXTAREA",
          "CODE",
          "PRE"
        ])
      };
    }
  });

  // src/core/debug.js
  function createDebugApi(app) {
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
        while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
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
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        app.changeLog.push(entry);
        if (app.changeLog.length > app.config.logLimit) {
          app.changeLog.shift();
        }
        if (app.config.logToConsole) {
          console.info(`[StayAI] Changed ${type}`, {
            before,
            after,
            ...meta
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
        const rootLabel = root?.nodeType === Node.ELEMENT_NODE ? app.getElementPath(root) : root?.nodeType === Node.TEXT_NODE ? `text node inside ${app.getElementPath(root.parentElement)}` : "unknown root";
        console.info(`[StayAI] Run ${runNumber} completed`, {
          changes,
          root: rootLabel,
          stats: app.report()
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
          `[StayAI] Debug logging ${app.config.debug ? "enabled" : "disabled"}.`
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
          `[StayAI] Per-change console logging ${app.config.logToConsole ? "enabled" : "disabled"}.`
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
          runtimeTranslationsRemoved: 0
        };
        app.clearChangeLog();
        return app.report();
      }
    };
  }
  var init_debug = __esm({
    "src/core/debug.js"() {
    }
  });

  // src/core/dom.js
  function createDomApi(app) {
    return {
      shouldIgnoreElement(element) {
        if (!element) return true;
        if (app.config.ignoredTags.has(element.tagName)) return true;
        if (element.closest("[data-i18n-ignore]")) return true;
        return false;
      },
      normalizeWhitespace(value) {
        return String(value).replace(/\s+/g, " ").trim();
      },
      escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      },
      preserveOuterWhitespace(original, replacement) {
        const leading = original.match(/^\s*/)?.[0] ?? "";
        const trailing = original.match(/\s*$/)?.[0] ?? "";
        return `${leading}${replacement}${trailing}`;
      },
      getDirectTextNodes(element) {
        return [...element.childNodes].filter(
          (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
        );
      },
      getAllDirectTextNodes(element) {
        return [...element.childNodes].filter(
          (node) => node.nodeType === Node.TEXT_NODE
        );
      },
      hasNestedElementChildren(element) {
        return element.children.length > 0;
      },
      setNodeValueIfChanged(node, value) {
        if (!node || node.nodeValue === value) return false;
        node.nodeValue = value;
        return true;
      },
      /**
       * Processes a single text node.
       *
       * This is the default path for normal UI text where the full string is
       * available in one node, for example "Subscriptions" or "Next order".
       */
      processTextNode(node) {
        if (app.shouldIgnoreElement(node.parentElement)) return;
        const original = node.nodeValue;
        const localized = app.localizeValue(original);
        if (localized !== original) {
          node.nodeValue = localized;
          app.stats.textNodesChanged += 1;
          app.stats.totalChanges += 1;
          app.logChange("text-node", original, localized, {
            parentTag: node.parentElement?.tagName,
            path: app.getElementPath(node.parentElement)
          });
        }
      },
      /**
       * Processes translatable attributes such as aria-label, title or placeholder.
       *
       * This is needed because not all visible or accessible UI text is stored
       * directly inside text nodes.
       */
      processAttributes(element) {
        if (app.shouldIgnoreElement(element)) return;
        for (const attr of app.config.attributes) {
          if (!element.hasAttribute(attr)) continue;
          const original = element.getAttribute(attr);
          const localized = app.localizeValue(original);
          if (localized !== original) {
            element.setAttribute(attr, localized);
            app.stats.attributesChanged += 1;
            app.stats.totalChanges += 1;
            app.logChange("attribute", original, localized, {
              attribute: attr,
              tag: element.tagName,
              path: app.getElementPath(element)
            });
          }
        }
      },
      /**
       * Handles phrases that StayAI/React renders across multiple text nodes.
       *
       * Example:
       * ["Billed every", "2", "weeks"] should become
       * ["Alle ", "2", " Wochen abgerechnet"]
       *
       * The important part is that dynamic number nodes stay untouched where
       * possible. This allows React/StayAI to continue updating those values later.
       */
      processSplitPhraseElement(element) {
        if (app.shouldIgnoreElement(element)) return;
        const textNodes = app.getDirectTextNodes(element);
        if (textNodes.length < 2) return;
        if (app.hasNestedElementChildren(element)) return;
        const normalizedValues = textNodes.map(
          (node) => app.normalizeWhitespace(node.nodeValue)
        );
        const fullText = app.normalizeWhitespace(element.textContent);
        if (!fullText) return;
        const splitPhraseMeta = () => ({
          tag: element.tagName,
          path: app.getElementPath(element)
        });
        const singularOrPlural = (count, singular, plural) => Number(count) === 1 ? singular : plural;
        const handleBillingFrequency = (unitPattern, singular, plural) => {
          const match = fullText.match(
            new RegExp(
              `^(Billed every|Alle)\\s+(\\d+)\\s+(${unitPattern})(?:\\s+abgerechnet)?$`,
              "i"
            )
          );
          if (!match) return false;
          const prefixIndex = normalizedValues.findIndex(
            (value) => /^(Billed every|Alle)$/i.test(value)
          );
          const numberIndex = normalizedValues.findIndex(
            (value) => /^\d+$/.test(value)
          );
          const unitIndex = normalizedValues.findIndex(
            (value) => new RegExp(`^(${unitPattern})(?:\\s+abgerechnet)?$`, "i").test(value)
          );
          if (prefixIndex === -1 || numberIndex === -1 || unitIndex === -1 || prefixIndex === numberIndex || numberIndex === unitIndex) {
            return true;
          }
          let changed = false;
          changed = app.setNodeValueIfChanged(textNodes[prefixIndex], "Alle ") || changed;
          changed = app.setNodeValueIfChanged(
            textNodes[unitIndex],
            ` ${singularOrPlural(match[2], singular, plural)} abgerechnet`
          ) || changed;
          app.markSplitPhraseChange(
            changed,
            fullText,
            app.normalizeWhitespace(element.textContent),
            splitPhraseMeta()
          );
          return true;
        };
        if (handleBillingFrequency("weeks?|Wochen", "Woche", "Wochen")) return;
        if (handleBillingFrequency("days?|Tage", "Tag", "Tage")) return;
        if (handleBillingFrequency("months?|Monate", "Monat", "Monate")) return;
        const selectedFlavorsMatch = fullText.match(
          /^(You have selected|Du hast)\s+(\d+)\s+(of|von)\s+(\d+)\s+(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i
        );
        if (selectedFlavorsMatch) {
          const numberIndexes = normalizedValues.map((value, index) => /^\d+$/.test(value) ? index : -1).filter((index) => index !== -1);
          if (numberIndexes.length < 2) return;
          let changed = false;
          textNodes.forEach((node, index) => {
            const value = app.normalizeWhitespace(node.nodeValue);
            if (/^(You have selected|Du hast)$/i.test(value)) {
              changed = app.setNodeValueIfChanged(node, "Du hast ") || changed;
              return;
            }
            if (/^(of|von)$/i.test(value)) {
              changed = app.setNodeValueIfChanged(node, " von ") || changed;
              return;
            }
            if (/^(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i.test(value)) {
              changed = app.setNodeValueIfChanged(
                node,
                ` ${singularOrPlural(
                  selectedFlavorsMatch[4],
                  "Geschmacksrichtung",
                  "Geschmacksrichtungen"
                )} ausgew\xE4hlt`
              ) || changed;
              return;
            }
            if (!numberIndexes.includes(index)) {
              const localized = app.localizeValue(node.nodeValue);
              changed = app.setNodeValueIfChanged(node, localized) || changed;
            }
          });
          app.markSplitPhraseChange(
            changed,
            fullText,
            app.normalizeWhitespace(element.textContent),
            splitPhraseMeta()
          );
        }
      },
      /**
       * Handles prices rendered as split text nodes.
       *
       * StayAI/React may render prices like this:
       * ["€", "269.76"]
       *
       * Instead of replacing the whole parent element with one string, only the
       * amount node is formatted:
       * ["", "269,76 €"]
       *
       * This keeps the original node structure mostly intact and avoids breaking
       * later React/StayAI updates to the dynamic amount.
       */
      processSplitCurrencyElement(element) {
        if (app.shouldIgnoreElement(element)) return;
        const textNodes = app.getAllDirectTextNodes(element);
        if (textNodes.length < 2) return;
        const englishAmountPattern = /^-?(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)$/;
        const germanCurrencyPattern = /^-?\d{1,3}(?:\.\d{3})*,\d{2}\s*€$/;
        const values = textNodes.map((node) => node.nodeValue.trim());
        const markSplitCurrency = () => {
          element.setAttribute("data-stayai-split-currency", "true");
        };
        const formatAmountNode = (amountIndex, nodesToClear = []) => {
          const rawAmount = textNodes[amountIndex]?.nodeValue.trim();
          if (!rawAmount) return false;
          if (germanCurrencyPattern.test(rawAmount)) return false;
          if (!englishAmountPattern.test(rawAmount)) return false;
          const formatted = app.formatEuroAmount ? app.formatEuroAmount(rawAmount) : null;
          if (!formatted) return false;
          const before = textNodes.map((node) => node.nodeValue).join("");
          for (const index of nodesToClear) {
            if (textNodes[index]) {
              textNodes[index].nodeValue = "";
            }
          }
          textNodes[amountIndex].nodeValue = formatted;
          markSplitCurrency();
          app.stats.splitCurrencyNodesChanged += 1;
          app.stats.totalChanges += 1;
          app.logChange("split-currency", before, formatted, {
            tag: element.tagName,
            path: app.getElementPath(element)
          });
          return true;
        };
        if (element.getAttribute("data-stayai-split-currency") === "true") {
          const amountIndex = values.findIndex(
            (value) => englishAmountPattern.test(value)
          );
          if (amountIndex !== -1) {
            formatAmountNode(amountIndex);
          }
          return;
        }
        const euroIndex = values.findIndex((value) => value === "\u20AC");
        if (euroIndex !== -1) {
          const amountIndex = values.findIndex(
            (value, index) => index !== euroIndex && englishAmountPattern.test(value)
          );
          if (amountIndex !== -1) {
            formatAmountNode(amountIndex, [euroIndex]);
          }
          return;
        }
        const eurIndex = values.findIndex((value) => value === "EUR");
        if (eurIndex !== -1) {
          const amountIndex = values.findIndex(
            (value, index) => index !== eurIndex && englishAmountPattern.test(value)
          );
          if (amountIndex !== -1) {
            formatAmountNode(amountIndex, [eurIndex]);
          }
        }
      },
      /**
       * Processes one element-level unit.
       *
       * Attributes and split-node cases are handled before the recursive DOM walk
       * continues with child nodes.
       */
      processElement(element) {
        if (app.shouldIgnoreElement(element)) return;
        app.processAttributes(element);
        app.processSplitPhraseElement(element);
        app.processSplitCurrencyElement(element);
      },
      /**
       * Walks through the DOM and processes both elements and text nodes.
       *
       * TreeWalker is used instead of innerHTML replacement to avoid destroying
       * event listeners, component state or React-managed DOM structures.
       */
      walk(root = app.config.root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
          app.processTextNode(root);
          return;
        }
        if (root.nodeType === Node.ELEMENT_NODE) {
          if (app.shouldIgnoreElement(root)) return;
          app.processElement(root);
        }
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node2) => {
              if (node2.nodeType === Node.ELEMENT_NODE) {
                return app.shouldIgnoreElement(node2) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
              }
              if (node2.nodeType === Node.TEXT_NODE) {
                return node2.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_REJECT;
            }
          }
        );
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeType === Node.TEXT_NODE) {
            app.processTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            app.processElement(node);
          }
        }
      }
    };
  }
  var init_dom = __esm({
    "src/core/dom.js"() {
    }
  });

  // src/core/localization.js
  function createLocalizationApi(app) {
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
        const entries = [...app.translations.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([source, target]) => ({ source, target }));
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
        app.compiledPatterns = [...app.translations.entries()].sort(([a], [b]) => b.length - a.length).map(([source, target]) => ({
          source,
          target,
          pattern: app.makeTranslationPattern(source)
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
          "Du hast $1 von $2 Geschmacksrichtungen ausgew\xE4hlt"
        );
        result = result.replace(
          /\bBilled every\s+(\d+)\s+(weeks?|days?|months?)\b/gi,
          (match, count, unit) => {
            const normalizedUnit = unit.toLowerCase();
            if (normalizedUnit.startsWith("week")) {
              return `Alle ${count} ${Number(count) === 1 ? "Woche" : "Wochen"} abgerechnet`;
            }
            if (normalizedUnit.startsWith("day")) {
              return `Alle ${count} ${Number(count) === 1 ? "Tag" : "Tage"} abgerechnet`;
            }
            return `Alle ${count} ${Number(count) === 1 ? "Monat" : "Monate"} abgerechnet`;
          }
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
            app.translations.get(normalized)
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
      }
    };
  }
  var init_localization = __esm({
    "src/core/localization.js"() {
    }
  });

  // src/core/observer.js
  function createObserverApi(app) {
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
          characterData: true
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
      }
    };
  }
  var init_observer = __esm({
    "src/core/observer.js"() {
    }
  });

  // src/core/routeHook.js
  function createRouteHookApi(app, globalKey) {
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
        app.routeHandler = () => {
          requestAnimationFrame(() => {
            app.run(app.config.root);
          });
          setTimeout(() => app.run(app.config.root), 100);
          setTimeout(() => app.run(app.config.root), 400);
          setTimeout(() => app.run(app.config.root), 1e3);
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
      }
    };
  }
  var init_routeHook = __esm({
    "src/core/routeHook.js"() {
    }
  });

  // src/translation.js
  function createTranslationMap(groups) {
    return new Map(
      Object.values(groups).flatMap((group) => Object.entries(group))
    );
  }
  var TRANSLATION_GROUPS;
  var init_translation = __esm({
    "src/translation.js"() {
      TRANSLATION_GROUPS = {
        navigation: {
          "Notifications (F8)": "Benachrichtigungen (F8)"
        },
        subscriptionStates: {
          Active: "Aktiv",
          Paused: "Pausiert",
          Skipped: "\xDCbersprungen",
          Canceled: "Storniert"
        },
        skipDeliveriesDialog: {
          "Skip deliveries": "Lieferungen \xFCberspringen",
          "Select how many weeks you want to skip your subscription.": "W\xE4hle aus, f\xFCr wie viele Wochen du dein Abonnement \xFCberspringen m\xF6chtest.",
          // Corrects partially translated German text.
          "W\xE4hle aus, wie viele Wochen du deine Abonnement \xFCberspringen m\xF6chtest.": "W\xE4hle aus, f\xFCr wie viele Wochen du dein Abonnement \xFCberspringen m\xF6chtest."
        },
        subscriptionLabels: {
          Subscription: "Abonnement",
          Subscriptions: "Abonnements",
          "New Subscription": "Neues Abonnement",
          "New Abonnement": "Neues Abonnement",
          "Active Subscriptions": "Aktive Abonnements",
          "Paused Subscriptions": "Pausierte Abonnements",
          "Canceled Subscriptions": "Stornierte Abonnements",
          // Corrects mixed German/English or partially translated labels.
          "Paused Abonnements": "Pausierte Abonnements",
          "Pausiert Abonnements": "Pausierte Abonnements",
          "pausierte Abonnements": "pausierten Abonnements"
        },
        pauseDialog: {
          "Pause subscription": "Abonnement pausieren",
          "Select a date until when you want to pause your subscription.": "W\xE4hle ein Datum aus, bis zu dem du dein Abonnement pausieren m\xF6chtest.",
          "Pause until": "Pausieren bis",
          Cancel: "Abbrechen",
          "Pause Abonnement": "Abonnement pausieren"
        },
        subscriptionDetails: {
          "Started on": "Gestartet am",
          "Selected flavors: (": "Ausgew\xE4hlte Geschmacksrichtungen: (",
          "flavors for": "Geschmacksrichtungen f\xFCr",
          "Next delivery:": "N\xE4chste Lieferung:",
          "Weiter delivery:": "N\xE4chste Lieferung:"
        },
        selectionSummary: {
          "You have selected": "Du hast",
          selected: "ausgew\xE4hlt",
          of: "von",
          flavors: "Geschmacksrichtungen"
        },
        billingFrequency: {
          "Billed every": "Alle"
        },
        cancellationDialog: {
          "Abonnement stornieren": "Abonnement stornieren",
          "Bist du sicher, dass du diese Abonnement stornieren m\xF6chtest? Diese Aktion kann nicht r\xFCckg\xE4ngig gemacht werden.": "Bist du sicher, dass du dieses Abonnement stornieren m\xF6chtest? Diese Aktion kann nicht r\xFCckg\xE4ngig gemacht werden.",
          "Deine Abonnement wird sofort storniert und du erh\xE4ltst keine weiteren Lieferungen mehr.": "Dein Abonnement wird sofort storniert und du erh\xE4ltst keine weiteren Lieferungen mehr."
        },
        frequencyUnits: {
          Every: "Alle",
          every: "alle",
          week: "Woche",
          weeks: "Wochen",
          day: "Tag",
          days: "Tage",
          month: "Monat",
          months: "Monate"
        },
        statusLines: {
          "Skipped until": "\xDCbersprungen bis",
          "Paused until": "Pausiert bis"
        },
        actions: {
          "Skip next": "N\xE4chste Lieferung \xFCberspringen",
          Unskip: "\xDCberspringen aufheben",
          Resume: "Fortsetzen",
          Edit: "Bearbeiten",
          Remove: "Entfernen",
          Manage: "Verwalten"
        },
        orderAndAccount: {
          "Order history": "Bestellverlauf",
          "Next order": "N\xE4chste Bestellung",
          "Shipping address": "Lieferadresse",
          "Payment method": "Zahlungsmethode",
          Quantity: "Menge",
          Frequency: "H\xE4ufigkeit"
        },
        profile: {
          "Delivery Address": "Lieferadresse",
          "Update your delivery address for subscriptions": "Aktualisiere deine Lieferadresse f\xFCr Abonnements",
          "Street Address": "Stra\xDFe und Hausnummer",
          // Intentionally left untranslated for the live demo.
          // City: "Stadt",
          "Postal Code": "Postleitzahl",
          Country: "Land",
          Germany: "Deutschland",
          // Corrects mixed German/English button text.
          "Bearbeiten Address": "Adresse bearbeiten"
        },
        settings: {
          "Werde benachrichtigt, wenn deine Abonnement verl\xE4ngert wird": "Werde benachrichtigt, wenn dein Abonnement verl\xE4ngert wird"
        }
      };
    }
  });

  // src/formatters/date.js
  function formatDateFragments(value) {
    let result = value;
    result = result.replace(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th),\s*(\d{4})\b/g,
      (match, month, day, year) => {
        const translated = monthTranslations.get(month);
        return translated ? `${Number(day)}. ${translated} ${year}` : match;
      }
    );
    result = result.replace(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/g,
      (match, month, year) => {
        const translated = monthTranslations.get(month);
        return translated ? `${translated} ${year}` : match;
      }
    );
    result = result.replace(
      /\b(Su|Mo|Tu|We|Th|Fr|Sa)\b/g,
      (match) => weekdayShortTranslations.get(match) ?? match
    );
    result = result.replace(
      /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g,
      (match, day, month) => {
        const translated = monthTranslations.get(month);
        return translated ? `${day}. ${translated}` : match;
      }
    );
    result = result.replace(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s*(\d{4})\b/g,
      (match, month, day, year) => {
        const num = monthNumbers.get(month);
        return num ? `${String(day).padStart(2, "0")}.${num}.${year}` : match;
      }
    );
    result = result.replace(
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{1,2}\.\d{1,2}\.\d{4})\b/g,
      (match, weekday, datePart) => {
        const translated = weekdayTranslations.get(weekday);
        return translated ? `${translated}, ${datePart}` : match;
      }
    );
    return result;
  }
  var monthTranslations, monthNumbers, weekdayTranslations, weekdayShortTranslations;
  var init_date = __esm({
    "src/formatters/date.js"() {
      monthTranslations = /* @__PURE__ */ new Map([
        ["Jan", "Jan."],
        ["January", "Januar"],
        ["Feb", "Feb."],
        ["February", "Februar"],
        ["Mar", "M\xE4rz"],
        ["March", "M\xE4rz"],
        ["Apr", "Apr."],
        ["April", "April"],
        ["May", "Mai"],
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
        ["December", "Dezember"]
      ]);
      monthNumbers = /* @__PURE__ */ new Map([
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
        ["December", "12"]
      ]);
      weekdayTranslations = /* @__PURE__ */ new Map([
        ["Monday", "Montag"],
        ["Tuesday", "Dienstag"],
        ["Wednesday", "Mittwoch"],
        ["Thursday", "Donnerstag"],
        ["Friday", "Freitag"],
        ["Saturday", "Samstag"],
        ["Sunday", "Sonntag"]
      ]);
      weekdayShortTranslations = /* @__PURE__ */ new Map([
        ["Su", "So"],
        ["Mo", "Mo"],
        ["Tu", "Di"],
        ["We", "Mi"],
        ["Th", "Do"],
        ["Fr", "Fr"],
        ["Sa", "Sa"]
      ]);
    }
  });

  // src/formatters/times.js
  function formatTimeFragments(value) {
    let result = value;
    result = result.replace(
      /\b(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)\b/gi,
      (match, hour, minute, period) => {
        let h = Number(hour);
        const normalizedPeriod = period.toUpperCase();
        if (normalizedPeriod === "PM" && h !== 12) h += 12;
        if (normalizedPeriod === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${minute} Uhr`;
      }
    );
    result = result.replace(
      /\b(0?[1-9]|1[0-2])\s*(AM|PM)\b/gi,
      (match, hour, period) => {
        let h = Number(hour);
        const normalizedPeriod = period.toUpperCase();
        if (normalizedPeriod === "PM" && h !== 12) h += 12;
        if (normalizedPeriod === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:00 Uhr`;
      }
    );
    return result;
  }
  var init_times = __esm({
    "src/formatters/times.js"() {
    }
  });

  // src/formatters/currency.js
  function parseEnglishAmount(rawAmount) {
    const amount = Number(String(rawAmount).replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(amount) ? amount : null;
  }
  function formatEuroAmount(rawAmount) {
    const amount = parseEnglishAmount(rawAmount);
    return amount !== null ? euroFormatter.format(amount) : null;
  }
  function formatCurrencyFragments(value) {
    const amountPattern = "-?(?<![,.\\d])(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+)";
    const pattern = new RegExp(
      `\u20AC\\s*(${amountPattern})|(${amountPattern})\\s*\u20AC|(${amountPattern})\\s*EUR\\b|\\bEUR\\s*(${amountPattern})`,
      "g"
    );
    return value.replace(pattern, (match, g1, g2, g3, g4) => {
      const raw = g1 ?? g2 ?? g3 ?? g4;
      return formatEuroAmount(raw) ?? match;
    });
  }
  var euroFormatter;
  var init_currency = __esm({
    "src/formatters/currency.js"() {
      euroFormatter = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
      });
    }
  });

  // src/index.js
  var require_index = __commonJS({
    "src/index.js"() {
      init_config();
      init_debug();
      init_dom();
      init_localization();
      init_observer();
      init_routeHook();
      init_translation();
      init_date();
      init_times();
      init_currency();
      (() => {
        "use strict";
        const GLOBAL_KEY = "__StayAILocalizationOriginalHistory__";
        if (!window[GLOBAL_KEY]) {
          window[GLOBAL_KEY] = {
            pushState: history.pushState,
            replaceState: history.replaceState
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
            runtimeTranslationsRemoved: 0
          },
          config,
          translationGroups: TRANSLATION_GROUPS,
          translations: createTranslationMap(TRANSLATION_GROUPS),
          formatDateFragments,
          formatTimeFragments,
          formatCurrencyFragments,
          formatEuroAmount
        };
        Object.assign(
          StayAILocalization,
          createDebugApi(StayAILocalization),
          createDomApi(StayAILocalization),
          createLocalizationApi(StayAILocalization),
          createObserverApi(StayAILocalization),
          createRouteHookApi(StayAILocalization, GLOBAL_KEY)
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
          StayAILocalization.report()
        );
        console.log(
          "[StayAI] Runtime API available: addTranslation, addTranslations, removeTranslation, listTranslations, showChangeLog, clearChangeLog, setDebug, setConsoleLogging, run, stop, restart, report."
        );
        return StayAILocalization.report();
      })();
    }
  });
  require_index();
})();
