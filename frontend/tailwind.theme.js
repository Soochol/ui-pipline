/**
 * Tailwind Theme Configuration
 *
 * This file exports theme values for use in tailwind.config.js.
 * Values are kept in sync with core/config/theme.ts
 */

const themeColors = {
  // Background colors
  darkbg: "#1e1e1e",
  darkpanel: "#252526",
  darkborder: "#3e3e42",
  darkhover: "#2a2d2e",

  // Action colors
  primary: "#007acc",
  primaryhover: "#005a9e",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#ef4444",

  // Pin colors for data types
  pinTrigger: "#ffffff",
  pinNumber: "#4a9eff",
  pinString: "#ffd700",
  pinBoolean: "#4ade80",
  pinImage: "#ef4444",
};

module.exports = {
  colors: themeColors,
};
