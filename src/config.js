// src/config.js

export const config = {
  root: document.body || document.documentElement,

  debounceMs: 50,
  maxWaitMs: 1000,

  debug: false,
  logToConsole: true,
  logRunSummary: true,
  logLimit: 150,

  attributes: ["placeholder", "title", "aria-label", "alt"],

  ignoredTags: new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "IFRAME",
    "SVG",
    "CANVAS",
    "TEXTAREA",
    "CODE",
    "PRE",
  ]),
};
