/**
 * Curated invoice accent colors. Each one has at least 4.5:1 contrast against white, so accent
 * text on the invoice stays readable whichever color is picked.
 */
export const ACCENT_COLORS = [
  { name: "Vermilion", value: "#C2410C" },
  { name: "Cobalt", value: "#1D4ED8" },
  { name: "Forest", value: "#2F6B4F" },
  { name: "Teal", value: "#0F766E" },
  { name: "Plum", value: "#7E22CE" },
  { name: "Graphite", value: "#334155" },
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number]["value"];

export const ACCENT_COLOR_VALUES = ACCENT_COLORS.map((color) => color.value) as [
  AccentColor,
  ...AccentColor[],
];

export const DEFAULT_ACCENT_COLOR: AccentColor = "#C2410C";
