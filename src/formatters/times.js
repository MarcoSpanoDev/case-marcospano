// src/formatters/times.js

export function formatTimeFragments(value) {
  let result = value;

  result = result.replace(
    /\b(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)\b/gi,
    (match, hour, minute, period) => {
      let h = Number(hour);
      const normalizedPeriod = period.toUpperCase();

      if (normalizedPeriod === "PM" && h !== 12) h += 12;
      if (normalizedPeriod === "AM" && h === 12) h = 0;

      return `${String(h).padStart(2, "0")}:${minute} Uhr`;
    },
  );

  result = result.replace(
    /\b(0?[1-9]|1[0-2])\s*(AM|PM)\b/gi,
    (match, hour, period) => {
      let h = Number(hour);
      const normalizedPeriod = period.toUpperCase();

      if (normalizedPeriod === "PM" && h !== 12) h += 12;
      if (normalizedPeriod === "AM" && h === 12) h = 0;

      return `${String(h).padStart(2, "0")}:00 Uhr`;
    },
  );

  return result;
}
