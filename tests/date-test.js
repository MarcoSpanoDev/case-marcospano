(() => {
  const L = window.StayAILocalization;

  if (!L) {
    console.error("StayAILocalization not found.");
    return;
  }

  const container = document.createElement("div");
  container.innerHTML = `
    <span id="test-currency-1">€89.92</span>
    <span id="test-currency-2">€<!-- split -->89.92</span>
  `;

  const split = document.createElement("span");
  split.id = "test-currency-3";
  split.appendChild(document.createTextNode("€"));
  split.appendChild(document.createTextNode("89.92"));
  container.appendChild(split);

  document.body.appendChild(container);

  L.run(container);

  const results = [
    {
      name: "single text currency",
      actual: document.querySelector("#test-currency-1").textContent,
    },
    {
      name: "html comment split currency",
      actual: document.querySelector("#test-currency-2").textContent,
    },
    {
      name: "real split text nodes currency",
      actual: document.querySelector("#test-currency-3").textContent,
    },
  ];

  console.table(results);

  container.remove();

  return results;
})();
