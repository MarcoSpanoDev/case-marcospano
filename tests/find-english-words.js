(async () => {
  const ROUTES = ["/", "/subscriptions", "/history", "/profile", "/settings"];

  const WAIT_AFTER_ROUTE_CHANGE_MS = 900;

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "CANVAS",
  ]);

  const allResults = [];
  const seen = new Set();

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeText(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function isHiddenElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    const style = window.getComputedStyle(el);

    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      el.hidden === true ||
      el.getAttribute("aria-hidden") === "true"
    );
  }

  function getElementPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";

    const parts = [];

    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let part = el.tagName.toLowerCase();

      if (el.id) {
        part += `#${el.id}`;
        parts.unshift(part);
        break;
      }

      if (el.className && typeof el.className === "string") {
        const classes = el.className.trim().split(/\s+/).slice(0, 3).join(".");

        if (classes) {
          part += `.${classes}`;
        }
      }

      const parent = el.parentElement;

      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (sibling) => sibling.tagName === el.tagName,
        );

        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(el) + 1;
          part += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);
      el = el.parentElement;
    }

    return parts.join(" > ");
  }

  function collectVisibleTextNodes(route) {
    const results = [];

    function walk(node) {
      if (!node) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (SKIP_TAGS.has(node.tagName)) return;
        if (isHiddenElement(node)) return;

        for (const child of node.childNodes) {
          walk(child);
        }

        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalizeText(node.textContent);

        if (!text) return;

        const parent = node.parentElement;

        if (!parent) return;
        if (isHiddenElement(parent)) return;

        const path = getElementPath(parent);
        const key = `${route}::${text}::${path}`;

        if (seen.has(key)) return;
        seen.add(key);

        const item = {
          route,
          text,
          parentTag: parent.tagName.toLowerCase(),
          path,
        };

        results.push(item);
        allResults.push(item);
      }
    }

    walk(document.body);

    return results;
  }

  function goToRoute(route) {
    const targetUrl = new URL(route, window.location.origin).toString();

    history.pushState({}, "", targetUrl);

    window.dispatchEvent(new PopStateEvent("popstate"));

    window.dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL: window.location.href,
        newURL: targetUrl,
      }),
    );
  }

  console.log("🔎 Starte Route-Scan...");

  for (const route of ROUTES) {
    console.log(`➡️ Scanne Route: ${route}`);

    goToRoute(route);

    await wait(WAIT_AFTER_ROUTE_CHANGE_MS);

    if (window.StayAILocalization?.run) {
      window.StayAILocalization.run();
      await wait(200);
    }

    const routeResults = collectVisibleTextNodes(route);

    console.log(
      `✅ ${routeResults.length} sichtbare Text-Nodes gefunden auf ${route}`,
    );
  }

  window.AllRoutesDOMTextNodesReport = allResults;

  console.table(allResults);

  const uniqueTexts = [...new Set(allResults.map((item) => item.text))].sort();

  window.AllRoutesUniqueTextsReport = uniqueTexts;

  console.log("📌 Unique sichtbare Texte:");
  console.table(uniqueTexts.map((text) => ({ text })));

  console.log(
    `✅ Fertig. ${allResults.length} Text-Nodes über ${ROUTES.length} Routes gesammelt.`,
  );

  console.log("Gespeichert in:");
  console.log("window.AllRoutesDOMTextNodesReport");
  console.log("window.AllRoutesUniqueTextsReport");

  return {
    allTextNodes: allResults,
    uniqueTexts,
  };
})();
