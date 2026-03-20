export const themePalette = {
  background: "#0B1220",
  surface: "#111827",
  card: "#1A2333",
  border: "#2A3447",
  primary: "#6366F1",
  violet: "#8B5CF6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#38BDF8",
  teal: "#14B8A6",
  orange: "#F97316",
  emerald: "#10B981",
  slate: "#64748B",
  foreground: "#E5E7EB",
  muted: "#9CA3AF",
} as const;

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export interface AccentTone {
  accent: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  glow: string;
  glowStrong: string;
}

export const createAccentTone = (accent: string): AccentTone => ({
  accent,
  surface: hexToRgba(accent, 0.14),
  surfaceStrong: hexToRgba(accent, 0.2),
  border: hexToRgba(accent, 0.38),
  text: accent,
  glow: `0 0 18px ${hexToRgba(accent, 0.22)}`,
  glowStrong: `0 0 12px ${hexToRgba(accent, 0.4)}`,
});
