import { Link } from "react-router";
import { GlassCard } from "~/components/glass-card";
import { CatIcon } from "~/components/icons";
import {
  NUM,
  type CategoryKey,
  type Theme,
  type ThemeTokens,
  THEMES,
} from "~/components/theme";
import { TransactionForm } from "~/components/transaction-form";
import { STR } from "~/lib/i18n";
import { formatIDR, monthNameID } from "~/lib/format";

export type CategoryBreakdown = {
  cat: CategoryKey;
  pct: number; // 0-100
  amt: number;
  name?: string;
  icon?: string;
  color?: string;
};

export function AnalyticsAndForm({
  theme,
  breakdown,
  totalForRange,
  expenseDelta,
  range = "month",
}: {
  T?: ThemeTokens;
  theme: Theme;
  breakdown: CategoryBreakdown[];
  totalForRange: number;
  expenseDelta: number;
  range?: "week" | "month" | "year";
}) {
  const dark = theme === "dark";

  const rangeOptions = [
    { label: STR.rangeWeek, value: "week" as const },
    { label: STR.rangeMonth, value: "month" as const },
    { label: STR.rangeYear, value: "year" as const },
  ];

  // donut math
  const R = 78;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = breakdown.map((d) => {
    const len = (d.pct / 100) * C;
    const seg = {
      ...d,
      dash: `${len} ${C - len}`,
      offset: -acc,
    };
    acc += len;
    return seg;
  });

  const deltaPositive = expenseDelta > 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-3 md:gap-3.5 lg:gap-4.5 mb-3.5 md:mb-4 lg:mb-4.5">
      {/* Donut */}
      <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px] overflow-hidden">
        <div className="flex justify-between items-start mb-4.5 gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-brand-text tracking-[-0.2px]">
              {STR.spendingByCategory}
            </div>
            <div className="text-xs text-brand-text-dim mt-0.75">
              {range === "week"
                ? "7 hari terakhir"
                : range === "year"
                  ? "Tahun " + new Date().getFullYear()
                  : STR.monthCategoriesCount(breakdown.length, monthNameID())}
            </div>
          </div>
          <div className="flex gap-1.5 p-0.75 rounded-full bg-brand-surface-2 border border-brand-hairline shrink-0 overflow-x-auto scrollbar-none">
            {rangeOptions.map((opt) => (
              <Link
                key={opt.value}
                to={`/?range=${opt.value}`}
                preventScrollReset
                className={`px-2.75 py-1.25 rounded-full text-[11.5px] font-semibold border-none no-underline transition-all whitespace-nowrap ${
                  range === opt.value
                    ? "bg-brand-surface-solid text-brand-text shadow-sm"
                    : "bg-transparent text-brand-text-dim hover:text-brand-text"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4.5 sm:gap-7 items-center">
          <div className="relative w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] mx-auto sm:mx-0">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 220 220"
              className="-rotate-90"
            >
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                className="stroke-brand-track"
                strokeWidth="22"
              />
              {segs.map((s, i) => (
                <circle
                  key={i}
                  cx="110"
                  cy="110"
                  r={R}
                  fill="none"
                  stroke={THEMES[theme].catColor(s.color || s.cat)}
                  strokeWidth="22"
                  strokeDasharray={s.dash}
                  strokeDashoffset={s.offset}
                  strokeLinecap="butt"
                  style={
                    dark
                      ? {
                          filter: `drop-shadow(0 0 6px color-mix(in srgb, ${THEMES[theme].catColor(s.color || s.cat)} 53%, transparent))`,
                        }
                      : undefined
                  }
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[11px] text-brand-text-mute tracking-wider uppercase font-semibold">
                {STR.donutTotal}
              </div>
              <div className="font-mono text-[22px] font-bold text-brand-text tracking-[-0.5px]">
                {formatIDR(totalForRange, { compact: true })}
              </div>
              <div
                className={`text-[11.5px] font-semibold ${
                  deltaPositive ? "text-brand-red" : "text-brand-accent"
                }`}
              >
                {deltaPositive ? "↗" : "↘"} {Math.abs(expenseDelta).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {breakdown.length === 0 ? (
              <div className="text-center py-6 text-brand-text-mute text-[13px]">
                Belum ada pengeluaran bulan ini.
              </div>
            ) : (
              breakdown.map((d) => (
                <div
                  key={d.cat}
                  className="grid grid-cols-[28px_1fr_auto] gap-2.5 items-center"
                >
                  <div
                    className="w-7 h-7 rounded-lg grid place-items-center border"
                    style={{
                      background: `color-mix(in srgb, ${THEMES[theme].catColor(d.color || d.cat)} 12%, transparent)`,
                      color: THEMES[theme].catColor(d.color || d.cat),
                      borderColor: `color-mix(in srgb, ${THEMES[theme].catColor(d.color || d.cat)} 20%, transparent)`,
                    }}
                  >
                    <CatIcon cat={d.icon || d.cat} size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex justify-between items-baseline mb-1 gap-2">
                      <span className="text-[13px] font-semibold text-brand-text whitespace-nowrap overflow-hidden text-ellipsis">
                        {d.name || STR.cat[d.cat]}
                      </span>
                      <span className="font-mono text-xs text-brand-text-dim font-semibold shrink-0">
                        {d.pct}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-brand-track overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, d.pct * 2.5)}%`,
                          background: THEMES[theme].catColor(d.color || d.cat),
                          boxShadow: dark
                            ? `0 0 6px color-mix(in srgb, ${THEMES[theme].catColor(d.color || d.cat)} 60%, transparent)`
                            : "none",
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-mono text-[13px] text-brand-text font-bold text-right whitespace-nowrap">
                    {formatIDR(d.amt, { compact: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </GlassCard>

      {/* Form — desktop only; mobile uses the FAB */}
      <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px] relative hidden lg:block">
        <div className="absolute -top-10 -right-10 w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,var(--violet)_33%,transparent_70%)] blur-[24px] pointer-events-none opacity-20" />
        <div className="relative">
          <TransactionForm T={{} as any} dark={dark} mode="add" />
        </div>
      </GlassCard>
    </section>
  );
}
