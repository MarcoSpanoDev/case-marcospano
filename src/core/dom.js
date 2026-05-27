// src/core/dom.js

export function createDomApi(app) {
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
        (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim(),
      );
    },

    getAllDirectTextNodes(element) {
      return [...element.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE,
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
          path: app.getElementPath(node.parentElement),
        });
      }
    },

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
            path: app.getElementPath(element),
          });
        }
      }
    },

    processSplitPhraseElement(element) {
      if (app.shouldIgnoreElement(element)) return;

      const textNodes = app.getDirectTextNodes(element);
      if (textNodes.length < 2) return;
      if (app.hasNestedElementChildren(element)) return;

      const normalizedValues = textNodes.map((node) =>
        app.normalizeWhitespace(node.nodeValue),
      );

      const fullText = app.normalizeWhitespace(element.textContent);
      if (!fullText) return;

      const splitPhraseMeta = () => ({
        tag: element.tagName,
        path: app.getElementPath(element),
      });

      const singularOrPlural = (count, singular, plural) =>
        Number(count) === 1 ? singular : plural;

      const handleBillingFrequency = (unitPattern, singular, plural) => {
        const match = fullText.match(
          new RegExp(
            `^(Billed every|Alle)\\s+(\\d+)\\s+(${unitPattern})(?:\\s+abgerechnet)?$`,
            "i",
          ),
        );

        if (!match) return false;

        const prefixIndex = normalizedValues.findIndex((value) =>
          /^(Billed every|Alle)$/i.test(value),
        );

        const numberIndex = normalizedValues.findIndex((value) =>
          /^\d+$/.test(value),
        );

        const unitIndex = normalizedValues.findIndex((value) =>
          new RegExp(`^(${unitPattern})(?:\\s+abgerechnet)?$`, "i").test(value),
        );

        if (
          prefixIndex === -1 ||
          numberIndex === -1 ||
          unitIndex === -1 ||
          prefixIndex === numberIndex ||
          numberIndex === unitIndex
        ) {
          return true;
        }

        let changed = false;

        changed =
          app.setNodeValueIfChanged(textNodes[prefixIndex], "Alle ") || changed;

        changed =
          app.setNodeValueIfChanged(
            textNodes[unitIndex],
            ` ${singularOrPlural(match[2], singular, plural)} abgerechnet`,
          ) || changed;

        app.markSplitPhraseChange(
          changed,
          fullText,
          app.normalizeWhitespace(element.textContent),
          splitPhraseMeta(),
        );

        return true;
      };

      if (handleBillingFrequency("weeks?|Wochen", "Woche", "Wochen")) return;
      if (handleBillingFrequency("days?|Tage", "Tag", "Tage")) return;
      if (handleBillingFrequency("months?|Monate", "Monat", "Monate")) return;

      const selectedFlavorsMatch = fullText.match(
        /^(You have selected|Du hast)\s+(\d+)\s+(of|von)\s+(\d+)\s+(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i,
      );

      if (selectedFlavorsMatch) {
        const numberIndexes = normalizedValues
          .map((value, index) => (/^\d+$/.test(value) ? index : -1))
          .filter((index) => index !== -1);

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

          if (
            /^(flavors|Geschmacksrichtungen)(?:\s+ausgewählt)?$/i.test(value)
          ) {
            changed =
              app.setNodeValueIfChanged(
                node,
                ` ${singularOrPlural(
                  selectedFlavorsMatch[4],
                  "Geschmacksrichtung",
                  "Geschmacksrichtungen",
                )} ausgewählt`,
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
          splitPhraseMeta(),
        );
      }
    },

    processSplitCurrencyElement(element) {
      if (app.shouldIgnoreElement(element)) return;

      const textNodes = app.getAllDirectTextNodes(element);
      if (textNodes.length < 2) return;

      const englishAmountPattern =
        /^-?(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)$/;

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

        const formatted = app.formatEuroAmount
          ? app.formatEuroAmount(rawAmount)
          : null;

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
          path: app.getElementPath(element),
        });

        return true;
      };

      if (element.getAttribute("data-stayai-split-currency") === "true") {
        const amountIndex = values.findIndex((value) =>
          englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex);
        }

        return;
      }

      const euroIndex = values.findIndex((value) => value === "€");

      if (euroIndex !== -1) {
        const amountIndex = values.findIndex(
          (value, index) =>
            index !== euroIndex && englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex, [euroIndex]);
        }

        return;
      }

      const eurIndex = values.findIndex((value) => value === "EUR");

      if (eurIndex !== -1) {
        const amountIndex = values.findIndex(
          (value, index) =>
            index !== eurIndex && englishAmountPattern.test(value),
        );

        if (amountIndex !== -1) {
          formatAmountNode(amountIndex, [eurIndex]);
        }
      }
    },

    processElement(element) {
      if (app.shouldIgnoreElement(element)) return;

      app.processAttributes(element);
      app.processSplitPhraseElement(element);
      app.processSplitCurrencyElement(element);
    },

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
          acceptNode: (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return app.shouldIgnoreElement(node)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT;
            }

            if (node.nodeType === Node.TEXT_NODE) {
              return node.nodeValue.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_REJECT;
          },
        },
      );

      let node;

      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          app.processTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          app.processElement(node);
        }
      }
    },
  };
}
