import { LinearGradient } from "expo-linear-gradient";

export const themes = {
  relationship: {
    gradient: ["#ffd4e5", "#d74894", "#831843", "#1a0512"] as const,
    header: "rgba(219,39,119,0.25)",
    headerBorder: "rgba(255,182,193,0.3)",
    card: "rgba(219,39,119,0.1)",
    cardBorder: "rgba(255,182,193,0.25)",
    innerCard: "rgba(255,255,255,0.05)",
    innerCardBorder: "rgba(255,182,193,0.3)",
    text: "text-pink-200/90",
    textLight: "text-pink-300/80",
    textMedium: "text-pink-300",
    textAccent: "text-pink-400",
    borderAccent: "border-pink-400/50",
    footer: "#1a0512",
    footerBorder: "rgba(255,182,193,0.2)",
  },
  friendship: {
    gradient: ["#dbeafe", "#3b82f6", "#1e3a8a", "#0c1220"] as const,
    header: "rgba(59,130,246,0.25)",
    headerBorder: "rgba(147,197,253,0.3)",
    card: "rgba(59,130,246,0.1)",
    cardBorder: "rgba(147,197,253,0.25)",
    innerCard: "rgba(255,255,255,0.05)",
    innerCardBorder: "rgba(147,197,253,0.3)",
    text: "text-blue-200/90",
    textLight: "text-blue-300/80",
    textMedium: "text-blue-300",
    textAccent: "text-blue-400",
    borderAccent: "border-blue-400/50",
    footer: "#172554",
    footerBorder: "rgba(147,197,253,0.3)",
  },
  group: {
    gradient: ["#4ade80", "#4ade80", "#166534", "#052e16"] as const,
    header: "rgba(74,222,128,0.25)",
    headerBorder: "rgba(134,239,172,0.3)",
    card: "rgba(74,222,128,0.1)",
    cardBorder: "rgba(134,239,172,0.25)",
    innerCard: "rgba(255,255,255,0.05)",
    innerCardBorder: "rgba(134,239,172,0.3)",
    text: "text-green-200/90",
    textLight: "text-green-300/80",
    textMedium: "text-green-300",
    textAccent: "text-green-400",
    borderAccent: "border-green-400/50",
    footer: "#052e16",
    footerBorder: "rgba(134,239,172,0.2)",
  },
};
export const gradients = {
  pink: themes.relationship.gradient,
  blue: themes.friendship.gradient,
  green: themes.group.gradient,
  purple: ["#e4d4ff", "#8748d7", "#431883", "#120a1a"] as const,
};

export function GradientBackground({ colors }: { colors: readonly string[] }) {
  return (
    <LinearGradient
      colors={colors as any}
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
    />
  );
}
