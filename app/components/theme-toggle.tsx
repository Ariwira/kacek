import { useFetcher } from "react-router";
import type { Theme } from "./theme";
import { SunIcon, MoonIcon } from "./icons";

export function ThemeToggle({ theme }: { theme: Theme; T?: any }) {
  const fetcher = useFetcher();
  const dark = theme === "dark";

  const submit = (next: Theme) => {
    fetcher.submit(
      { theme: next },
      { method: "post", action: "/action/theme" },
    );
  };

  return (
    <div className="inline-flex p-1 rounded-full bg-brand-surface-2 border border-brand-hairline">
      <button
        type="button"
        onClick={() => submit("light")}
        aria-pressed={!dark}
        title="Tema Terang"
        className={`inline-flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.75 rounded-full font-semibold text-xs font-sans cursor-pointer transition-all min-h-[32px] ${
          dark 
            ? "bg-transparent text-brand-text-dim hover:text-brand-text" 
            : "bg-brand-surface-solid text-brand-text shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        }`}
      >
        <SunIcon size={14} />
        <span className="hidden lg:inline">Terang</span>
      </button>
      <button
        type="button"
        onClick={() => submit("dark")}
        aria-pressed={dark}
        title="Tema Gelap"
        className={`inline-flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.75 rounded-full font-semibold text-xs font-sans cursor-pointer transition-all min-h-[32px] ${
          dark 
            ? "bg-brand-surface-solid text-brand-text shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),0_0_18px_rgba(52,245,160,0.18)]" 
            : "bg-transparent text-brand-text-dim hover:text-brand-text"
        }`}
      >
        <MoonIcon size={14} />
        <span className="hidden lg:inline">Gelap</span>
      </button>
    </div>
  );
}
