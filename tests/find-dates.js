(() => {
  const DATE_REGEX =
    /(?<!\d)(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s+\d{2,4})(?!\d)/gi;

  const results = [];
  const seen = new Set();

  function isVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    const style = window.getComputedStyle(el);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      !el.hidden &&
      el.getAttribute("aria-hidden") !== "true"
    );
  }

  function getPath(el) {
    const parts = [];

    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let part = el.tagName.toLowerCase();

      if (el.id) {
        part += `#${el.id}`;
        parts.unshift(part);
        break;
      }

      const parent = el.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (sibling) => sibling.tagName === el.tagName,
        );

        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
        }
      }

      parts.unshift(part);
      el = el.parentElement;
    }

    return parts.join(" > ");
  }

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  document.querySelectorAll("body *").forEach((el) => {
    if (!isVisible(el)) return;

    const text = normalize(el.textContent);
    if (!text) return;

    const matches = text.match(DATE_REGEX);
    if (!matches) return;

    for (const date of matches) {
      const key = `${date}::${getPath(el)}`;

      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        date,
        tag: el.tagName.toLowerCase(),
        text,
        path: getPath(el),
      });
    }
  });

  console.table(results);

  window.DOMDateReport = results;

  console.log(`✅ ${results.length} Datumsvorkommen gefunden.`);
  console.log("Ergebnis gespeichert in window.DOMDateReport");

  return results;
})();
