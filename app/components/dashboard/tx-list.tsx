import { useState } from "react";
import { GlassCard } from "~/components/glass-card";
import { TxRow, type Transaction } from "~/components/tx-row";
import { type ThemeTokens, type Theme } from "~/components/theme";
import { ArrowRightIcon } from "~/components/icons-extra";
import { STR } from "~/lib/i18n";
import { formatIDR } from "~/lib/format";

export function TxList({
  transactions,
  totalCount,
  netThisWeek,
  onEdit,
  theme = "dark",
}: {
  T?: ThemeTokens;
  transactions: Transaction[];
  totalCount: number;
  netThisWeek: number;
  onEdit?: (tx: Transaction) => void;
  theme?: Theme;
}) {
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  
  const filtered = transactions.filter(tx => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  const netPositive = netThisWeek >= 0;
  const filterOptions = [
    { label: STR.filterAll, value: "all" as const },
    { label: STR.filterExpense, value: "expense" as const },
    { label: STR.filterIncome, value: "income" as const },
  ];

  return (
    <section className="mb-2">
      <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px]">
        <div className="flex justify-between items-center mb-3.5 gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold text-brand-text tracking-[-0.2px]">
              {STR.recentActivity}
            </div>
            <div className="text-xs text-brand-text-dim mt-0.75">
              {STR.recentSubtitle(totalCount)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex gap-1.5 p-0.75 rounded-full bg-brand-surface-2 border border-brand-hairline">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={`px-2.75 py-1.25 rounded-full text-[11.5px] font-semibold border-none cursor-pointer font-sans transition-all ${
                    filter === opt.value ? "bg-brand-surface-solid text-brand-text shadow-sm" : "bg-transparent text-brand-text-dim hover:text-brand-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <a
              href="/transaksi"
              className="px-3 py-1.75 rounded-full text-xs font-semibold bg-transparent border border-brand-hairline text-brand-text-dim no-underline whitespace-nowrap transition-all hover:border-brand-text-dim hover:text-brand-text min-h-[32px] flex items-center gap-1.5"
            >
              {STR.viewAll}
              <ArrowRightIcon size={12} />
            </a>
          </div>
        </div>

        <div className="flex flex-col">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-brand-text-mute text-[13px]">
              {filter === "all" ? STR.txEmptyAll : "Tidak ada transaksi untuk filter ini."}
            </div>
          ) : (
            filtered.map((tx, i) => (
              <TxRow
                key={tx.id}
                tx={tx}
                last={i === filtered.length - 1}
                onClick={onEdit ? () => onEdit(tx) : undefined}
                theme={theme}
              />
            ))
          )}
        </div>

        {/* footer summary */}
        <div className="flex justify-between items-center mt-3.5 px-3.5 py-3 rounded-xl bg-brand-surface-2 border border-brand-hairline">
          <span className="text-xs text-brand-text-dim">
            {STR.netThisWeek}
          </span>
          <span
            className={`font-mono text-[14px] font-bold ${
              netPositive ? "text-brand-accent" : "text-brand-red"
            }`}
          >
            {netPositive ? "+" : "−"}
            {formatIDR(Math.abs(netThisWeek))}
          </span>
        </div>
      </GlassCard>
    </section>
  );
}
