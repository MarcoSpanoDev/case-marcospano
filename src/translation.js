// src/translation.js

export const TRANSLATION_GROUPS = {
  navigation: {
    "Notifications (F8)": "Benachrichtigungen (F8)",
  },

  subscriptionStates: {
    Active: "Aktiv",
    Paused: "Pausiert",
    Skipped: "Übersprungen",
  },

  subscriptionLabels: {
    "New Subscription": "Neues Abonnement",
    "New Abonnement": "Neues Abonnement",
    "Paused Abonnements": "Pausierte Abonnements",
    Subscriptions: "Abonnements",
    Subscription: "Abonnement",
  },

  subscriptionDetails: {
    "Started on": "Gestartet am",
    "Selected flavors: (": "Ausgewählte Geschmacksrichtungen: (",
    "flavors for": "Geschmacksrichtungen für",
    "Weiter delivery:": "Nächste Lieferung:",
    "Next delivery:": "Nächste Lieferung:",
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

  statusLines: {
    "Skipped until": "Übersprungen bis",
    "Paused until": "Pausiert bis",
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
};

export function createTranslationMap(groups) {
  return new Map(
    Object.values(groups).flatMap((group) => Object.entries(group)),
  );
}
