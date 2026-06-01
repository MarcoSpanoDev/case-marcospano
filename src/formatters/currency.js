/**
 * Currency formatter for EUR values.
 *
 * Converts English-style EUR amounts into German currency formatting,
 * for example "€89.92" to "89,92 €".
 */
const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function parseEnglishAmount(rawAmount) {
  const amount = Number(String(rawAmount).replace(/\s/g, "").replace(/,/g, ""));

  return Number.isFinite(amount) ? amount : null;
}

export function formatEuroAmount(rawAmount) {
  const amount = parseEnglishAmount(rawAmount);
  return amount !== null ? euroFormatter.format(amount) : null;
}

export function formatCurrencyFragments(value) {
  const amountPattern =
    "-?(?<![,.\\d])(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{1,2}|\\d+)";

  const pattern = new RegExp(
    `€\\s*(${amountPattern})|(${amountPattern})\\s*€|(${amountPattern})\\s*EUR\\b|\\bEUR\\s*(${amountPattern})`,
    "g",
  );

  return value.replace(pattern, (match, g1, g2, g3, g4) => {
    const raw = g1 ?? g2 ?? g3 ?? g4;
    return formatEuroAmount(raw) ?? match;
  });
}
