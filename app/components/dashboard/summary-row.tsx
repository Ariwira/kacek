import { useRouteLoaderData } from "react-router";
import { GlassCard } from "~/components/glass-card";
import { ArrowUpRight, ArrowDownRight } from "~/components/icons";
import { Sparkline } from "~/components/sparkline";
import { NUM, type Theme, type ThemeTokens } from "~/components/theme";
import { STR } from "~/lib/i18n";
import { formatIDR, monthNameID } from "~/lib/format";

export type SummaryData = {
  totalExpenses: number;
  budget: number;
  last7Total: number;
  last7Days: number[];
  expenseDelta: number; // percent
  balance: number;
  receivedToday: number;
  accounts: { id: string; name: string; amount: number; color: "violet" | "accent" }[];
  income: number;
  incomeDelta: number; // percent
  incomeTrend: number[];
};

export function SummaryRow({
  theme,
  data,
}: {
  T?: ThemeTokens;
  theme: Theme;
  data: SummaryData;
}) {
  const appData = useRouteLoaderData("routes/_app") as
    | { user?: { hideIncome?: boolean } }
    | undefined;
  const hideIncome = appData?.user?.hideIncome ?? false;

  const isExpenseUp = data.expenseDelta >= 0;
  const dark = theme === "dark";
  const max = Math.max(1, ...data.last7Days);
  const budgetPct = Math.min(
    100,
    Math.round((data.totalExpenses / Math.max(1, data.budget)) * 100),
  );

  return (
    <section
      className={`grid gap-3 md:gap-3.5 lg:gap-4.5 mb-3.5 md:mb-4 lg:mb-4.5 relative ${
        hideIncome
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]"
      }`}
    >
      {/* Hero — Total expenses */}
      <GlassCard
        className={`tour-summary p-[18px] md:p-[22px] lg:p-[26px] overflow-hidden ${
          hideIncome ? "" : "md:col-span-2 lg:col-span-1"
        } ${
          dark
            ? "bg-[linear-gradient(135deg,rgba(52,245,160,0.12),rgba(167,139,250,0.10)_60%,rgba(22,24,32,0.62))] border-[rgba(52,245,160,0.22)]"
            : "bg-[linear-gradient(135deg,rgba(14,159,110,0.10),rgba(92,108,219,0.06)_60%,rgba(255,255,255,0.85))] border-[rgba(14,159,110,0.18)]"
        }`}
      >
        <div className="absolute -top-[50px] -right-[50px] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,var(--accent)_40%,transparent_70%)] blur-[20px] opacity-25" />
        
        <div className="relative flex justify-between items-start mb-4">
          <div>
            <div className="text-[11px] tracking-wider uppercase text-brand-text-mute font-semibold mb-2">
              {STR.totalExpensesThisMonth}
            </div>
            <div className="text-[32px] md:text-[38px] lg:text-[40px] tracking-[-1px] md:tracking-[-1.2px] font-mono font-bold leading-[1.05] text-brand-text">
              {formatIDR(data.totalExpenses)}
            </div>
          </div>
          <span 
            className={`inline-flex items-center gap-1 px-2.25 py-1 rounded-full text-[11.5px] font-semibold ${
              isExpenseUp 
                ? "bg-brand-red-soft text-brand-red" 
                : "bg-brand-accent-soft text-brand-accent"
            }`}
          >
            {isExpenseUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {isExpenseUp ? "+" : ""}{data.expenseDelta.toFixed(1)}%
          </span>
        </div>

        <div className="relative">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11.5px] text-brand-text-dim">
              {formatIDR(data.budget)} {STR.monthlyBudget}
            </span>
            <span className="text-xs text-brand-accent font-bold font-mono">
              {budgetPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-brand-track overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-accent to-brand-violet"
              style={{
                width: `${budgetPct}%`,
                boxShadow: dark ? "0 0 16px var(--accent)" : "none",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-brand-text-mute uppercase tracking-wider mb-1 font-semibold">
              {STR.last7Days}
            </div>
            <div className="font-mono text-base font-bold text-brand-text">
              {formatIDR(data.last7Total)}
            </div>
          </div>
          <div className="flex items-end gap-1.25 h-[38px]">
            {data.last7Days.map((v, i) => (
              <div
                key={i}
                className={`w-2.25 rounded-[4px] transition-all ${
                  i === 5 ? "bg-brand-accent" : "bg-brand-track"
                }`}
                style={{
                  height: `${Math.max(10, (v / max) * 100)}%`,
                  boxShadow: i === 5 && dark ? "0 0 10px var(--accent)" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </GlassCard>

      {!hideIncome && (
        <>
          {/* Balance */}
          <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px]">
            <div className="text-[11px] tracking-wider uppercase text-brand-text-mute font-semibold mb-2">
              {STR.currentBalance}
            </div>
            <div className="text-[26px] lg:text-[32px] tracking-[-0.8px] lg:tracking-[-1px] font-mono font-bold leading-[1.1] text-brand-text">
              {formatIDR(data.balance)}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-2.25 py-1 rounded-full bg-brand-accent-soft text-brand-accent text-[11.5px] font-semibold">
                <ArrowUpRight size={11} /> +{formatIDR(data.receivedToday)}
              </span>
              <span className="text-xs text-brand-text-dim">
                {STR.receivedToday}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              {data.accounts.map((a, i) => (
                <div
                  key={a.id}
                  className="flex-1 p-2.5 md:px-3 rounded-xl bg-brand-surface-2 border border-brand-hairline"
                >
                  <div className="flex items-center gap-1.25 mb-0.75">
                    <span
                      className={`w-1.25 h-1.25 rounded-full ${
                        a.color === "violet" ? "bg-brand-violet" : "bg-brand-accent"
                      }`}
                      style={{
                        boxShadow: dark
                          ? `0 0 6px ${a.color === "violet" ? "var(--violet)" : "var(--accent)"}`
                          : "none",
                      }}
                    />
                    <span className="text-[10.5px] text-brand-text-mute whitespace-nowrap overflow-hidden text-ellipsis">
                      {a.name}
                    </span>
                  </div>
                  <div className="font-mono text-[13px] font-bold text-brand-text">
                    {formatIDR(a.amount)}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Income */}
          <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px]">
            <div className="text-[11px] tracking-wider uppercase text-brand-text-mute font-semibold mb-2">
              {STR.income} · {monthNameID()}
            </div>
            <div className="text-[26px] lg:text-[32px] tracking-[-0.8px] lg:tracking-[-1px] font-mono font-bold leading-[1.1] text-brand-text">
              {formatIDR(data.income)}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-2.25 py-1 rounded-full bg-brand-violet-soft text-brand-violet text-[11.5px] font-semibold">
                <ArrowUpRight size={11} /> +{data.incomeDelta.toFixed(1)}%
              </span>
              <span className="text-xs text-brand-text-dim">
                {STR.vsLastMonth}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[11px] text-brand-text-mute uppercase tracking-wider mb-1 font-semibold">
                {STR.trend12Weeks}
              </div>
              <Sparkline
                data={data.incomeTrend}
                color={dark ? "#A78BFA" : "#5C6CDB"}
                glow={dark}
                w={240}
                h={48}
              />
            </div>
          </GlassCard>
        </>
      )}
    </section>
  );
}
