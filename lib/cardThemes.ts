// Hesap kartı temaları — mobil ile birebir (constants/cardThemes.ts).
// Premium koyu, ince gradient + tek aksan parlaması.
export interface CardTheme {
  id: string;
  name: string;
  colors: [string, string, string]; // gradient (3 durak)
  glow: string; // köşe aksan parlaması
}

export const CARD_THEMES: CardTheme[] = [
  { id: "obsidian", name: "Obsidyen", colors: ["#26282f", "#15161a", "#0f1012"], glow: "rgba(0,191,166,0.12)" },
  { id: "ocean", name: "Okyanus", colors: ["#0c3d39", "#082826", "#040f0e"], glow: "rgba(0,191,166,0.22)" },
  { id: "midnight", name: "Gece Mavisi", colors: ["#13233f", "#0b1626", "#060c16"], glow: "rgba(56,138,221,0.22)" },
  { id: "amethyst", name: "Ametist", colors: ["#241a40", "#150f28", "#0c0918"], glow: "rgba(150,110,245,0.22)" },
  { id: "graphite", name: "Grafit", colors: ["#3b3e45", "#23262b", "#15171a"], glow: "rgba(255,255,255,0.08)" },
  { id: "crimson", name: "Bordo", colors: ["#3a1820", "#220e13", "#130809"], glow: "rgba(226,75,74,0.20)" },
];

export const getCardTheme = (id?: string | null): CardTheme =>
  CARD_THEMES.find((t) => t.id === id) || CARD_THEMES[0];
