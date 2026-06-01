/**
 * Central translation dictionary for missing StayAI UI strings.
 *
 * Keeps all static English-to-German translations grouped by feature area
 * and provides a helper to convert those groups into a lookup map.
 *
 * Note:
 * Some entries intentionally correct already partially translated strings.
 * This is needed because the app does not expose a template-level i18n API.
 */

export const TRANSLATION_GROUPS = {
  navigation: {
    "Notifications (F8)": "Benachrichtigungen (F8)",
  },

  subscriptionStates: {
    Active: "Aktiv",
    Paused: "Pausiert",
    Skipped: "Übersprungen",
    Canceled: "Storniert",
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
    "pausierte Abonnements": "pausierten Abonnements",
  },

  subscriptionDetails: {
    "Started on": "Gestartet am",
    "Selected flavors: (": "Ausgewählte Geschmacksrichtungen: (",
    "flavors for": "Geschmacksrichtungen für",
    "Next delivery:": "Nächste Lieferung:",
    "Weiter delivery:": "Nächste Lieferung:",
  },

  selectionSummary: {
    "You have selected": "Du hast",
    selected: "ausgewählt",
    of: "von",
    flavors: "Geschmacksrichtungen",
  },

  billingFrequency: {
    "Billed every": "Alle",
  },

  cancellationDialog: {
    "Abonnement stornieren": "Abonnement stornieren",

    "Bist du sicher, dass du diese Abonnement stornieren möchtest? Diese Aktion kann nicht rückgängig gemacht werden.":
      "Bist du sicher, dass du dieses Abonnement stornieren möchtest? Diese Aktion kann nicht rückgängig gemacht werden.",

    "Deine Abonnement wird sofort storniert und du erhältst keine weiteren Lieferungen mehr.":
      "Dein Abonnement wird sofort storniert und du erhältst keine weiteren Lieferungen mehr.",
  },

  frequencyUnits: {
    Every: "Alle",
    every: "alle",
    week: "Woche",
    weeks: "Wochen",
    day: "Tag",
    days: "Tage",
    month: "Monat",
    months: "Monate",
  },

  statusLines: {
    "Skipped until": "Übersprungen bis",
    "Paused until": "Pausiert bis",
  },

  actions: {
    "Skip next": "Nächste Lieferung überspringen",
    Unskip: "Überspringen aufheben",
    Resume: "Fortsetzen",
    Edit: "Bearbeiten",
    Remove: "Entfernen",
    Manage: "Verwalten",
  },

  orderAndAccount: {
    "Order history": "Bestellverlauf",
    "Next order": "Nächste Bestellung",
    "Shipping address": "Lieferadresse",
    "Payment method": "Zahlungsmethode",
    Quantity: "Menge",
    Frequency: "Häufigkeit",
  },

  profile: {
    "Delivery Address": "Lieferadresse",
    "Update your delivery address for subscriptions":
      "Aktualisiere deine Lieferadresse für Abonnements",
    "Street Address": "Straße und Hausnummer",

    // Intentionally left untranslated for the live demo.
    // City: "Stadt",

    "Postal Code": "Postleitzahl",
    Country: "Land",
    Germany: "Deutschland",

    // Corrects mixed German/English button text.
    "Bearbeiten Address": "Adresse bearbeiten",
  },

  settings: {
    "Werde benachrichtigt, wenn deine Abonnement verlängert wird":
      "Werde benachrichtigt, wenn dein Abonnement verlängert wird",
  },
};

export function createTranslationMap(groups) {
  return new Map(
    Object.values(groups).flatMap((group) => Object.entries(group)),
  );
}
