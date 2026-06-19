export type Theme = "dark" | "light";

export type CategoryKey =
  | "food"
  | "transport"
  | "bills"
  | "entertainment"
  | "shopping"
  | "income"
  | "health"
  | "education"
  | "gift"
  | "investment"
  | "other"
  | "transfer";

export type ThemeTokens = {
  bg: string;
  bgGradient: string;
  surface: string;
  surface2: string;
  surfaceSolid: string;
  input: string;
  text: string;
  textDim: string;
  textMute: string;
  hairline: string;
  hairline2: string;
  cardShadow: string;
  track: string;
  accent: string;
  accentSoft: string;
  violet: string;
  violetSoft: string;
  red: string;
  redSoft: string;
  catColor: (k: CategoryKey | string) => string;
};

export const CUSTOM_COLORS = [
  { key: "emerald", dark: "#34F5A0", light: "#0E9F6E" },
  { key: "violet", dark: "#A78BFA", light: "#5C6CDB" },
  { key: "blue", dark: "#60D5FF", light: "#0EA5E9" },
  { key: "amber", dark: "#FFB36B", light: "#F59E0B" },
  { key: "rose", dark: "#FF7A8A", light: "#E5484D" },
  { key: "pink", dark: "#F472B6", light: "#DB2777" },
  { key: "indigo", dark: "#818CF8", light: "#4F46E5" },
  { key: "orange", dark: "#FB923C", light: "#EA580C" },
  { key: "purple", dark: "#C084FC", light: "#7C3AED" },
  { key: "slate", dark: "#94A3B8", light: "#64748B" },
  { key: "teal", dark: "#2DD4BF", light: "#0D9488" },
  { key: "cyan", dark: "#22D3EE", light: "#0891B2" },
  { key: "lime", dark: "#A3E635", light: "#65A30D" },
  { key: "sky", dark: "#38BDF8", light: "#0284C7" },
  { key: "gold", dark: "#FACC15", light: "#CA8A04" },
  { key: "fuchsia", dark: "#E879F9", light: "#C026D3" },
  { key: "maroon", dark: "#FB7185", light: "#BE123C" },
  { key: "navy", dark: "#818CF8", light: "#3730A3" },
  { key: "forest", dark: "#4ADE80", light: "#166534" },
  { key: "crimson", dark: "#F87171", light: "#991B1B" },
  { key: "lavender", dark: "#E9D5FF", light: "#7E22CE" },
  { key: "sunset", dark: "#FDA4AF", light: "#9F1239" },
];

export const THEMES: Record<Theme, ThemeTokens> = {
  dark: {
    bg: "#0A0B10",
    bgGradient:
      "radial-gradient(1200px 800px at 12% -10%, rgba(52,245,160,0.13), transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(167,139,250,0.14), transparent 55%), radial-gradient(800px 500px at 50% 110%, rgba(52,245,160,0.06), transparent 60%), #0A0B10",
    surface: "rgba(22,24,32,0.55)",
    surface2: "rgba(255,255,255,0.04)",
    surfaceSolid: "rgba(34,38,48,0.95)",
    input: "rgba(255,255,255,0.04)",
    text: "#F4F5FA",
    textDim: "#9AA0AE",
    textMute: "#6B7180",
    hairline: "rgba(255,255,255,0.07)",
    hairline2: "rgba(255,255,255,0.12)",
    cardShadow:
      "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(0,0,0,0.7)",
    track: "rgba(255,255,255,0.07)",
    accent: "#34F5A0",
    accentSoft: "rgba(52,245,160,0.14)",
    violet: "#A78BFA",
    violetSoft: "rgba(167,139,250,0.14)",
    red: "#FF7A8A",
    redSoft: "rgba(255,122,138,0.14)",
    catColor: (k) =>
      ({
        food: "#34F5A0",
        transport: "#A78BFA",
        bills: "#60D5FF",
        entertainment: "#FFB36B",
        shopping: "#FF7A8A",
        income: "#34F5A0",
        health: "#F472B6",
        education: "#818CF8",
        gift: "#FB923C",
        investment: "#C084FC",
        other: "#94A3B8",
        transfer: "#60D5FF",
      })[k] || CUSTOM_COLORS.find(c => c.key === k)?.dark || "#A78BFA",
  },
  light: {
    bg: "#F6F7FB",
    bgGradient:
      "radial-gradient(1200px 800px at 8% -10%, rgba(14,159,110,0.10), transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(92,108,219,0.10), transparent 55%), radial-gradient(800px 500px at 50% 110%, rgba(14,159,110,0.05), transparent 60%), #F6F7FB",
    surface: "rgba(255,255,255,0.72)",
    surface2: "rgba(20,30,60,0.04)",
    surfaceSolid: "#FFFFFF",
    input: "#FFFFFF",
    text: "#0E1422",
    textDim: "#5A6275",
    textMute: "#8A92A6",
    hairline: "rgba(20,30,60,0.07)",
    hairline2: "rgba(20,30,60,0.12)",
    cardShadow:
      "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -24px rgba(20,30,60,0.18), 0 2px 6px rgba(20,30,60,0.04)",
    track: "rgba(20,30,60,0.07)",
    accent: "#0E9F6E",
    accentSoft: "rgba(14,159,110,0.11)",
    violet: "#5C6CDB",
    violetSoft: "rgba(92,108,219,0.11)",
    red: "#E5484D",
    redSoft: "rgba(229,72,77,0.10)",
    catColor: (k) =>
      ({
        food: "#0E9F6E",
        transport: "#5C6CDB",
        bills: "#0EA5E9",
        entertainment: "#F59E0B",
        shopping: "#E5484D",
        income: "#0E9F6E",
        health: "#DB2777",
        education: "#4F46E5",
        gift: "#EA580C",
        investment: "#7C3AED",
        other: "#64748B",
        transfer: "#0EA5E9",
      })[k] || CUSTOM_COLORS.find(c => c.key === k)?.light || "#5C6CDB",
  },
};

export const getCatColor = (key: string, theme: Theme = "dark") => {
  return THEMES[theme].catColor(key);
};

export const FONT = `'Plus Jakarta Sans', system-ui, sans-serif`;
export const NUM = `'JetBrains Mono', monospace`;
