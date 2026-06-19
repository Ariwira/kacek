import { useLoaderData, useRouteLoaderData, useSearchParams, useNavigation, Link } from "react-router";
import { useMemo, useState } from "react";
import type { Route } from "./+types/_app.laporan";
import { requireUserId } from "~/lib/auth.server";
import { getReportData, getUserStats } from "~/lib/queries.server";
import { db } from "~/lib/db.server";
import { categories as categoriesTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { THEMES, type Theme, type CategoryKey, getCatColor } from "~/components/theme";
import { Header } from "~/components/dashboard/header";
import { GlassCard } from "~/components/glass-card";
import { CatIcon, ArrowUpRight, ArrowDownRight } from "~/components/icons";
import { DownloadIcon } from "~/components/icons-extra";
import { STR } from "~/lib/i18n";
import { formatIDR } from "~/lib/format";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  
  const period = (url.searchParams.get("period") as "week" | "month" | "year") || "month";
  const catsParam = url.searchParams.get("cats") || "";
  const categoryFilters = catsParam ? catsParam.split(",") : [];

  const [reportData, userCategories, stats] = await Promise.all([
    getReportData(userId, period, categoryFilters),
    db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId)),
    getUserStats(userId),
  ]);

  return { reportData, userCategories, stats, period, categoryFilters };
}

const DEFAULT_FILTER_CATS: CategoryKey[] = [
  "food",
  "transport",
  "bills",
  "shopping",
  "income",
];

export default function LaporanPage() {
  const { reportData, userCategories, stats, period, categoryFilters } = useLoaderData<typeof loader>();
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const dark = theme === "dark";
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const appData = useRouteLoaderData("routes/_app") as
    | { user?: { hideIncome?: boolean } }
    | undefined;
  const hideIncome = appData?.user?.hideIncome ?? false;

  // Re-map category lists for filtering
  const allCategories = useMemo(() => {
    const list: { key: string; label: string; icon: string; color: string }[] = DEFAULT_FILTER_CATS
      .filter((c) => !hideIncome || c !== "income")
      .map((c) => ({
        key: c,
        label: STR.cat[c] || c,
        icon: c,
        color: c,
      }));
    userCategories.forEach((c) => {
      list.push({
        key: c.id,
        label: c.name,
        icon: c.icon,
        color: c.color,
      });
    });
    return list;
  }, [userCategories, hideIncome]);

  // Handle category chip click
  const toggleCategoryFilter = (catKey: string) => {
    const nextFilters = [...categoryFilters];
    const idx = nextFilters.indexOf(catKey);
    if (idx > -1) {
      nextFilters.splice(idx, 1);
    } else {
      nextFilters.push(catKey);
    }

    const params = new URLSearchParams(searchParams);
    if (nextFilters.length > 0) {
      params.set("cats", nextFilters.join(","));
    } else {
      params.delete("cats");
    }
    setSearchParams(params, { preventScrollReset: true });
  };

  // Toggle period
  const setPeriod = (p: "week" | "month" | "year") => {
    const params = new URLSearchParams(searchParams);
    params.set("period", p);
    setSearchParams(params, { preventScrollReset: true });
  };

  // Export currently loaded data as CSV
  const exportCSV = () => {
    const headers = ["Tanggal", "Kategori", "Catatan", "Tipe", "Jumlah"];
    const rows = reportData.transactions.map((t: any) => {
      const dateStr = new Date(t.date).toLocaleDateString("id-ID");
      const catLabel = t.catName || STR.cat[t.cat as CategoryKey] || t.cat;
      const typeStr = t.type === "income" ? "Pemasukan" : "Pengeluaran";
      return [
        dateStr,
        `"${catLabel}"`,
        `"${t.note.replace(/"/g, '""')}"`,
        typeStr,
        t.amount,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `Laporan_KaCek_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate maximum value for SVG bar chart scaling
  const maxVal = useMemo(() => {
    const vals = reportData.trend.map((d) => Math.max(d.expense, d.income));
    return Math.max(...vals, 100000); // minimum scale
  }, [reportData.trend]);

  return (
    <div className="kc-bg-gradient min-h-screen p-4 md:p-6 lg:p-7 pb-24 md:pb-8 lg:pb-7 text-brand-text font-sans">
      <div className="max-w-[1440px] mx-auto relative">
        <Header
          theme={theme}
          T={T}
          userInitials={
            stats?.name || stats?.email
              ? (stats.name || stats.email).substring(0, 2).toUpperCase()
              : "??"
          }
        />

        {/* Heading */}
        <div className="mb-6 mt-1 flex justify-between items-start gap-4 flex-wrap md:flex-nowrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-brand-text m-0">
              {STR.reportPageTitle}
            </h1>
            <div className="text-xs text-brand-text-mute mt-1">
              {STR.reportPageSubtitle}
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={exportCSV}
              className="px-3.5 py-2.25 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text-dim text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:text-brand-text hover:border-brand-text-dim min-h-[44px] transition-all"
            >
              <DownloadIcon size={14} /> {STR.exportCsvBtn}
            </button>
          </div>
        </div>

        {/* Period Switcher */}
        <div className="flex gap-1 p-0.75 rounded-full bg-brand-surface-2 border border-brand-hairline self-start mb-6 w-fit">
          {(["week", "month", "year"] as const).map((p) => {
            const active = period === p;
            const label = p === "week" ? "Minggu Ini" : p === "year" ? "Tahun Ini" : "Bulan Ini";
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border-none cursor-pointer whitespace-nowrap transition-all ${
                  active
                    ? "bg-brand-surface-solid text-brand-text shadow-sm"
                    : "bg-transparent text-brand-text-dim hover:text-brand-text"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category Multi-Select Filter Chips */}
        <div className="mb-6">
          <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-2">Filter Kategori</div>
          <div className="flex flex-wrap gap-2 py-1">
            {allCategories.map((c) => {
              const active = categoryFilters.includes(c.key);
              const cColor = getCatColor(c.color || c.key, theme);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCategoryFilter(c.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.75 rounded-full text-xs font-bold border cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-brand-accent-soft text-brand-accent border-brand-accent/40"
                      : "bg-brand-surface-2 text-brand-text-dim border-brand-hairline hover:text-brand-text"
                  }`}
                  style={
                    active
                      ? {
                          background: `color-mix(in srgb, ${cColor} 12%, transparent)`,
                          color: cColor,
                          borderColor: `color-mix(in srgb, ${cColor} 40%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <CatIcon cat={c.icon} size={13} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`transition-opacity duration-150 ${navigation.state === "loading" ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <GlassCard className="p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute">
                  {STR.totalExpense}
                </span>
                <h3 className="text-2xl font-mono font-bold text-brand-text mt-1 mb-0">
                  {formatIDR(reportData.totalExpense)}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <div
                  className={`flex items-center text-xs font-bold ${
                    reportData.expenseDelta > 0
                      ? "text-brand-red"
                      : reportData.expenseDelta < 0
                        ? "text-brand-accent"
                        : "text-brand-text-mute"
                  }`}
                >
                  {reportData.expenseDelta > 0 ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )}
                  <span>{Math.abs(Math.round(reportData.expenseDelta))}%</span>
                </div>
                <span className="text-[10.5px] text-brand-text-mute">vs periode lalu</span>
              </div>
            </GlassCard>

            {!hideIncome && (
              <>
                <GlassCard className="p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute">
                      {STR.totalIncome}
                    </span>
                    <h3 className="text-2xl font-mono font-bold text-brand-accent mt-1 mb-0">
                      {formatIDR(reportData.totalIncome)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4">
                    <div
                      className={`flex items-center text-xs font-bold ${
                        reportData.incomeDelta > 0
                          ? "text-brand-accent"
                          : reportData.incomeDelta < 0
                            ? "text-brand-red"
                            : "text-brand-text-mute"
                      }`}
                    >
                      {reportData.incomeDelta > 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      <span>{Math.abs(Math.round(reportData.incomeDelta))}%</span>
                    </div>
                    <span className="text-[10.5px] text-brand-text-mute">vs periode lalu</span>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute">
                      {STR.netIncome}
                    </span>
                    <h3 className={`text-2xl font-mono font-bold mt-1 mb-0 ${reportData.net >= 0 ? "text-brand-text" : "text-brand-red"}`}>
                      {reportData.net < 0 ? "−" : ""}{formatIDR(Math.abs(reportData.net))}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4">
                    <div
                      className={`flex items-center text-xs font-bold ${
                        reportData.netDelta > 0
                          ? "text-brand-accent"
                          : reportData.netDelta < 0
                            ? "text-brand-red"
                            : "text-brand-text-mute"
                      }`}
                    >
                      {reportData.netDelta > 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      <span>{Math.abs(Math.round(reportData.netDelta))}%</span>
                    </div>
                    <span className="text-[10.5px] text-brand-text-mute">vs periode lalu</span>
                  </div>
                </GlassCard>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Visual Trend Chart */}
            <GlassCard className="p-5 lg:col-span-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-4">Tren Transaksi</div>
              
              {reportData.trend.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-brand-text-mute">
                  Tidak ada data untuk periode ini.
                </div>
              ) : (
                <div className="w-full overflow-x-auto scrollbar-none">
                  <div className="min-w-[500px]">
                    <svg viewBox="0 0 600 220" className="w-full overflow-visible text-brand-text-mute">
                      <defs>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF7A8A" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#FF7A8A" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34F5A0" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#34F5A0" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="50" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                      <line x1="50" y1="95" x2="580" y2="95" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                      <line x1="50" y1="170" x2="580" y2="170" stroke="rgba(255,255,255,0.12)" />

                      {/* Y-Axis Labels */}
                      <text x="40" y="24" textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5" className="font-mono">
                        {formatIDR(maxVal).replace(",00", "")}
                      </text>
                      <text x="40" y="99" textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5" className="font-mono">
                        {formatIDR(maxVal / 2).replace(",00", "")}
                      </text>
                      <text x="40" y="174" textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5" className="font-mono">
                        0
                      </text>

                      {/* Draw bars dynamically */}
                      {reportData.trend.map((d, i) => {
                        const N = reportData.trend.length;
                        const w = (600 - 50 - 20) / N;
                        const x = 50 + i * w + w * 0.1;
                        const hExp = (d.expense / maxVal) * 150;
                        const hInc = (d.income / maxVal) * 150;

                        return (
                          <g key={i} className="group cursor-pointer">
                            {/* Hover info overlay placeholder or styling */}
                            <title>
                              {d.label}: Pengeluaran Rp {new Intl.NumberFormat("id-ID").format(d.expense)}
                              {!hideIncome && ` | Pemasukan Rp ${new Intl.NumberFormat("id-ID").format(d.income)}`}
                            </title>

                            {hideIncome ? (
                              // Centered wider expense bar
                              <rect
                                x={x + w * 0.1}
                                y={170 - hExp}
                                width={w * 0.6}
                                height={Math.max(hExp, 2)}
                                rx="3"
                                fill="#FF7A8A"
                                className="transition-all opacity-85 group-hover:opacity-100"
                              />
                            ) : (
                              // Two adjacent thinner bars
                              <>
                                <rect
                                  x={x}
                                  y={170 - hExp}
                                  width={w * 0.35}
                                  height={Math.max(hExp, 2)}
                                  rx="2"
                                  fill="#FF7A8A"
                                  className="transition-all opacity-85 group-hover:opacity-100"
                                />
                                <rect
                                  x={x + w * 0.4}
                                  y={170 - hInc}
                                  width={w * 0.35}
                                  height={Math.max(hInc, 2)}
                                  rx="2"
                                  fill="#34F5A0"
                                  className="transition-all opacity-85 group-hover:opacity-100"
                                />
                              </>
                            )}

                            {/* Label Text */}
                            <text
                              x={x + w * 0.35}
                              y="192"
                              textAnchor="middle"
                              fontSize="8"
                              fill="currentColor"
                              opacity="0.5"
                              className="group-hover:opacity-100 font-semibold transition-opacity"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Category Breakdown (Expenses) */}
            <GlassCard className="p-5">
              <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-4">Sebaran Pengeluaran</div>
              
              {reportData.breakdown.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-brand-text-mute text-center">
                  Tidak ada pengeluaran untuk periode ini.
                </div>
              ) : (
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-1">
                  {reportData.breakdown.map((item) => {
                    const cColor = getCatColor(item.color || item.cat, theme);
                    const catLabel = item.name || STR.cat[item.cat as CategoryKey] || item.cat;
                    return (
                      <div key={item.cat} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 font-bold text-brand-text">
                            <span style={{ color: cColor }} className="flex shrink-0">
                              <CatIcon cat={item.icon || item.cat} size={14} />
                            </span>
                            <span>{catLabel}</span>
                          </div>
                          <div className="text-right font-mono font-bold">
                            <span>{formatIDR(item.amt)}</span>
                            <span className="text-[10px] text-brand-text-mute ml-1">({item.pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-brand-surface-2 overflow-hidden border border-brand-hairline">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${item.pct}%`,
                              backgroundColor: cColor,
                              boxShadow: `0 0 10px ${cColor}33`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Transactions List within report */}
          <GlassCard className="p-5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-4">Daftar Transaksi Periode Ini</div>
            {reportData.transactions.length === 0 ? (
              <div className="text-center py-12 text-brand-text-mute text-xs">
                Tidak ada transaksi yang cocok untuk filter saat ini.
              </div>
            ) : (
              <div className="flex flex-col max-h-[350px] overflow-y-auto pr-1">
                {reportData.transactions.map((tx, idx) => {
                  const isIncome = tx.type === "income";
                  const dateStr = new Date(tx.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  });
                  const cColor = getCatColor(tx.catColor || tx.cat, theme);
                  const catLabel = tx.catName || STR.cat[tx.cat as CategoryKey] || tx.cat;

                  return (
                    <div
                      key={tx.id}
                      className={`grid grid-cols-[40px_1fr_auto] gap-3 items-center py-3.25 px-1 border-none bg-transparent ${
                        idx === reportData.transactions.length - 1
                          ? ""
                          : "border-b border-brand-hairline"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl grid place-items-center border"
                        style={{
                          background: `color-mix(in srgb, ${cColor} 10%, transparent)`,
                          color: cColor,
                          borderColor: `color-mix(in srgb, ${cColor} 20%, transparent)`,
                        }}
                      >
                        <CatIcon cat={tx.catIcon || tx.cat} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-brand-text truncate">
                          {tx.note || catLabel}
                        </div>
                        <div className="flex gap-2 mt-0.75 items-center text-xs text-brand-text-mute">
                          <span>{dateStr}</span>
                          <span className="w-0.75 h-0.75 rounded-full bg-brand-text-mute" />
                          <span>{catLabel}</span>
                        </div>
                      </div>
                      <div
                        className={`text-right font-mono text-[15px] font-bold ${
                          isIncome ? "text-brand-accent" : "text-brand-text"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatIDR(Math.abs(tx.amount))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
