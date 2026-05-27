(() => {
  const L = window.StayAILocalization;

  if (!L) {
    console.error("StayAILocalization not found.");
    return;
  }

  const normalize = (value) =>
    String(value)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const testRoot = document.createElement("div");
  testRoot.setAttribute("data-stayai-test-root", "true");

  const splitCurrency = document.createElement("span");
  splitCurrency.appendChild(document.createTextNode("€"));
  splitCurrency.appendChild(document.createTextNode("89.92"));

  const splitBilling = document.createElement("p");
  splitBilling.appendChild(document.createTextNode("Billed every "));
  splitBilling.appendChild(document.createTextNode("4"));
  splitBilling.appendChild(document.createTextNode(" weeks"));

  const splitSelected = document.createElement("p");
  splitSelected.appendChild(document.createTextNode("You have selected "));
  splitSelected.appendChild(document.createTextNode("2"));
  splitSelected.appendChild(document.createTextNode(" of "));
  splitSelected.appendChild(document.createTextNode("4"));
  splitSelected.appendChild(document.createTextNode(" flavors"));

  testRoot.appendChild(splitCurrency);
  testRoot.appendChild(splitBilling);
  testRoot.appendChild(splitSelected);

  document.body.appendChild(testRoot);

  L.run(testRoot);

  const results = [
    {
      passed: normalize(splitCurrency.textContent) === "89,92 €" ? "✅" : "❌",
      name: "DOM split currency",
      expected: "89,92 €",
      actual: normalize(splitCurrency.textContent),
    },
    {
      passed:
        normalize(splitBilling.textContent) === "Alle 4 Wochen abgerechnet"
          ? "✅"
          : "❌",
      name: "DOM split billing phrase",
      expected: "Alle 4 Wochen abgerechnet",
      actual: normalize(splitBilling.textContent),
    },
    {
      passed:
        normalize(splitSelected.textContent) ===
        "Du hast 2 von 4 Geschmacksrichtungen ausgewählt"
          ? "✅"
          : "❌",
      name: "DOM split selected flavors phrase",
      expected: "Du hast 2 von 4 Geschmacksrichtungen ausgewählt",
      actual: normalize(splitSelected.textContent),
    },
  ];

  console.table(results);

  testRoot.remove();

  const failed = results.filter((result) => result.passed === "❌");

  if (failed.length === 0) {
    console.log(`✅ All ${results.length} DOM tests passed.`);
  } else {
    console.warn(`❌ ${failed.length} of ${results.length} DOM tests failed.`);
  }

  return results;
})();
