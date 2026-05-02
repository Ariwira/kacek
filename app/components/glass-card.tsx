import type { CSSProperties, ReactNode } from "react";
import type { ThemeTokens } from "./theme";

export function GlassCard({
  style,
  children,
  className = "",
}: {
  T?: ThemeTokens; // Keep for compatibility but prioritize Tailwind
  style?: CSSProperties;
  children: ReactNode;
  padding?: number; // Deprecated in favor of Tailwind classes
  className?: string;
}) {
  return (
    <div
      className={`relative bg-brand-surface border border-brand-hairline rounded-[22px] backdrop-blur-[24px] saturate-[140%] shadow-[var(--card-shadow)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
