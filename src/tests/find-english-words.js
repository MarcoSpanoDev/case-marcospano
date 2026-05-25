(() => {
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "CANVAS",
  ]);

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

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  const results = [];
  const seen = new Set();

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
      const key = `${text}::${path}`;

      if (seen.has(key)) return;
      seen.add(key);

      results.push({
        text,
        parentTag: parent.tagName.toLowerCase(),
        path,
      });
    }
  }

  walk(document.body);

  console.table(results);

  window.DOMTextNodesReport = results;

  console.log(
    `✅ ${results.length} sichtbare Text Nodes gefunden. Ergebnis gespeichert in window.DOMTextNodesReport`,
  );

  return results;
})();
