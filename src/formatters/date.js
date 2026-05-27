// src/formatters/date.js

const monthTranslations = new Map([
  ["Jan", "Jan."],
  ["January", "Januar"],
  ["Feb", "Feb."],
  ["February", "Februar"],
  ["Mar", "März"],
  ["March", "März"],
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
  ["December", "Dezember"],
]);

const monthNumbers = new Map([
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
  ["December", "12"],
]);

const weekdayTranslations = new Map([
  ["Monday", "Montag"],
  ["Tuesday", "Dienstag"],
  ["Wednesday", "Mittwoch"],
  ["Thursday", "Donnerstag"],
  ["Friday", "Freitag"],
  ["Saturday", "Samstag"],
  ["Sunday", "Sonntag"],
]);

export function formatDateFragments(value) {
  let result = value;

  result = result.replace(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g,
    (match, day, month) => {
      const translated = monthTranslations.get(month);
      return translated ? `${day}. ${translated}` : match;
    },
  );

  result = result.replace(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s*(\d{4})\b/g,
    (match, month, day, year) => {
      const num = monthNumbers.get(month);
      return num ? `${String(day).padStart(2, "0")}.${num}.${year}` : match;
    },
  );

  result = result.replace(
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{1,2}\.\d{1,2}\.\d{4})\b/g,
    (match, weekday, datePart) => {
      const translated = weekdayTranslations.get(weekday);
      return translated ? `${translated}, ${datePart}` : match;
    },
  );

  return result;
}
