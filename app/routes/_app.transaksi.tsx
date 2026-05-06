import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { eq } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { categories as categoriesTable } from "~/db/schema";
import type { Route } from "./+types/_app.transaksi";
import { requireUserId } from "~/lib/auth.server";
import {
  listTransactions,
  listRecurringTransactions,
  getUserStats,
} from "~/lib/queries.server";
import {
  THEMES,
  NUM,
  FONT,
  type Theme,
  type CategoryKey,
  type ThemeTokens,
  getCatColor,
} from "~/components/theme";
import { Header } from "~/components/dashboard/header";
import { GlassCard } from "~/components/glass-card";
import { CatIcon, SearchIcon, PlusIcon } from "~/components/icons";
import { TrashIcon, EditIcon, DownloadIcon } from "~/components/icons-extra";
import { TxRow } from "~/components/tx-row";
import { BottomSheet } from "~/components/bottom-sheet";
import { TransactionForm } from "~/components/transaction-form";
import { STR } from "~/lib/i18n";
import { formatIDR, formatRelativeDay } from "~/lib/format";
import { useToast } from "~/components/toast";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("cat") ?? "all",
    type: url.searchParams.get("type") ?? "all",
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };

  const [userCategories, transactions, recurring, stats] = await Promise.all([
    db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId))
      .catch(e => { console.error("User Categories Error:", e); return []; }),
    listTransactions(userId, filters)
      .catch(e => { console.error("List Transactions Error:", e); return []; }),
    listRecurringTransactions(userId)
      .catch(e => { console.error("List Recurring Error:", e); return []; }),
    getUserStats(userId)
      .catch(e => { console.error("User Stats Error:", e); return { totalTx: 0, joinedAt: new Date(), name: "", email: "" }; }),
  ]);

  return { filters, userCategories, transactions, recurring, stats };
}

const DEFAULT_ACTIVE_CATS: CategoryKey[] = [
  "food",
  "transport",
  "bills",
  "shopping",
  "income",
];

const TYPE_OPTIONS: { value: "all" | "expense" | "income"; label: string }[] = [
  { value: "all", label: STR.filterAll },
  { value: "expense", label: STR.filterExpense },
  { value: "income", label: STR.filterIncome },
];

export default function TransaksiPage() {
  const loaderData = useLoaderData<typeof loader>();
  if (!loaderData) return null;
  const { transactions, recurring, filters, stats, userCategories } = loaderData;

  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const dark = theme === "dark";
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    amount: number;
    type: "expense" | "income";
    category: CategoryKey;
    note: string;
    date: string;
    accountId?: string;
    receiptUrl?: string | null;
  } | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<{
    id: string;
    amount: number;
    type: "expense" | "income";
    category: CategoryKey;
    accountId: string;
    note: string;
    frequency: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRecurring, setDeletingRecurring] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hiddenRecurringIds, setHiddenRecurringIds] = useState<Set<string>>(
    new Set(),
  );

  const deleteFetcher = useFetcher();
  const navigation = useNavigation();
  const wasSubmitting = useRef(false);

  useEffect(() => {
    const isSubmitting =
      navigation.state === "submitting" &&
      navigation.formAction?.startsWith("/action/transaction") === true;

    if (isSubmitting) wasSubmitting.current = true;
    if (wasSubmitting.current && navigation.state === "idle") {
      wasSubmitting.current = false;
      setEditing(null);
      setIsAdding(false);
    }
  }, [navigation.state, navigation.formAction]);

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

        {/* Page heading */}
        <div className="mb-3.5 mt-1 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-brand-text m-0">
              {STR.txPageTitle}
            </h1>
            <div className="text-xs text-brand-text-dim mt-1">
              {STR.txPageSubtitle(transactions.length)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className={`hidden lg:flex px-3.5 py-2.25 rounded-xl border-none bg-gradient-to-br from-brand-accent to-brand-violet ${dark ? "text-[#06180F]" : "text-white"} font-bold text-xs cursor-pointer items-center gap-1.5 transition-all shadow-lg shadow-brand-accent/10 min-h-[44px]`}
            >
              <PlusIcon size={14} /> {STR.addTransactionBtn}
            </button>
            <a
              href="/action/export"
              download
              className="px-3.5 py-2.25 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text-dim text-xs font-bold no-underline flex items-center gap-1.5 transition-all hover:text-brand-text hover:border-brand-text-dim min-h-[44px]"
            >
              <DownloadIcon size={14} /> Ekspor Excel
            </a>
          </div>
        </div>

        <FilterBar userCategories={userCategories} theme={theme} />

        <div className={`tour-tx-list transition-opacity duration-150 ${navigation.state === "loading" ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          {(() => {
              const visibleTx = transactions.filter((tx) => !hiddenIds.has(String(tx.id)));
              const map = new Map<string, any[]>();
              for (const tx of visibleTx) {
                const key = formatRelativeDay(tx.date);
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(tx);
              }
              const grouped = Array.from(map.entries());
              const visibleRecurring = recurring.filter((rt) => !hiddenRecurringIds.has(rt.id));
              const hasActiveFilter = filters.q || filters.category !== "all" || filters.type !== "all" || filters.from || filters.to;
              return (
                <>
                  <GlassCard className="p-[18px] md:p-[22px] lg:p-[26px] mt-3.5">
                    {grouped.length === 0 ? (
                      <div className="text-center py-12 px-4 text-brand-text-mute text-[13px]">
                        {hasActiveFilter ? STR.txEmpty : STR.txEmptyAll}
                      </div>
                    ) : (
                      grouped.map(([dateLabel, txs]) => (
                        <div key={dateLabel} className="mb-4.5">
                          <div className="text-[11px] tracking-wider uppercase text-brand-text-mute font-bold mb-2 pl-1">
                            {dateLabel}
                          </div>
                          <div className="flex flex-col">
                            {txs.map((tx, i) => (
                              <TxRow
                                key={tx.id}
                                tx={tx}
                                last={i === txs.length - 1}
                                theme={theme}
                                onClick={() =>
                                  setEditing({
                                    id: String(tx.id),
                                    amount: tx.amount,
                                    type: tx.type,
                                    category: tx.cat,
                                    note: tx.note,
                                    accountId: tx.accountId ?? undefined,
                                    receiptUrl: tx.receiptUrl,
                                    date: new Date(tx.date).toISOString().slice(0, 10),
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </GlassCard>

                  {visibleRecurring.length > 0 && (
                    <div className="mt-8 mb-4">
                      <h2 className="text-lg font-bold text-brand-text mb-3">
                        Transaksi Rutin
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleRecurring.map((rt) => (
                          <GlassCard key={rt.id} className="p-4 flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl grid place-items-center border shrink-0"
                              style={{
                                background: `color-mix(in srgb, ${getCatColor(rt.catColor || rt.category, theme)} 10%, transparent)`,
                                color: getCatColor(rt.catColor || rt.category, theme),
                                borderColor: `color-mix(in srgb, ${getCatColor(rt.catColor || rt.category, theme)} 20%, transparent)`,
                              }}
                            >
                              <CatIcon cat={rt.catIcon || rt.category} size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-brand-text truncate">
                                {rt.note || rt.catName || STR.cat[rt.category as CategoryKey]}
                              </div>
                              <div className="text-[11px] text-brand-text-mute">
                                {rt.frequency === "daily"
                                  ? "Harian"
                                  : rt.frequency === "weekly"
                                    ? "Mingguan"
                                    : rt.frequency === "monthly"
                                      ? "Bulanan"
                                      : "Tahunan"}{" "}
                                · {formatIDR(rt.amount)}
                              </div>
                              <div className="text-[10px] text-brand-accent mt-1 font-semibold">
                                Berikutnya:{" "}
                                {new Date(rt.nextOccurrence).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                type="button"
                                className="w-8 h-8 rounded-lg bg-brand-surface-2 text-brand-text-dim border border-brand-hairline cursor-pointer grid place-items-center transition-all hover:text-brand-text"
                                onClick={() =>
                                  setEditingRecurring({
                                    id: rt.id,
                                    amount: rt.amount,
                                    type: rt.type,
                                    category: rt.category as CategoryKey,
                                    accountId: rt.accountId!,
                                    note: rt.note || "",
                                    frequency: rt.frequency,
                                  })
                                }
                              >
                                <EditIcon size={14} />
                              </button>
                              <button
                                type="button"
                                className="w-8 h-8 rounded-lg bg-brand-red-soft text-brand-red border-none cursor-pointer grid place-items-center transition-transform hover:scale-105"
                                onClick={() =>
                                  setDeletingRecurring({
                                    id: rt.id,
                                    name: rt.note || STR.cat[rt.category as CategoryKey],
                                  })
                                }
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          </GlassCard>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
          })()}
        </div>
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={STR.editTx}
      >
        {editing && (
          <TransactionForm
            dark={dark}
            mode="edit"
            compact
            defaults={editing}
            onDelete={() => setIsDeleting(true)}
            onFormSuccess={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={!!editingRecurring}
        onClose={() => setEditingRecurring(null)}
        title="Edit Jadwal Rutin"
      >
        {editingRecurring && (
          <div className="p-1">
            <TransactionForm
              dark={dark}
              mode="edit"
              compact
              defaults={{
                id: editingRecurring.id,
                amount: editingRecurring.amount,
                type: editingRecurring.type,
                category: editingRecurring.category,
                accountId: editingRecurring.accountId,
                note: editingRecurring.note,
                date: new Date().toISOString().slice(0, 10),
              }}
              customAction={`/action/recurring/${editingRecurring.id}/update`}
            />
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        title={STR.addTransaction}
      >
        <TransactionForm dark={dark} mode="add" compact onFormSuccess={() => setIsAdding(false)} />
      </BottomSheet>

      <BottomSheet
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        title={STR.deleteTxConfirm}
      >
        <div className="p-1">
          <p className="text-sm text-brand-text-dim mb-6 leading-relaxed">
            Data transaksi ini akan dihapus permanen. Tindakan ini tidak dapat
            dibatalkan.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleting(false)}
              className="flex-1 px-4 py-3 rounded-2xl border border-brand-hairline bg-brand-surface-2 text-brand-text font-bold text-sm cursor-pointer min-h-[48px]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  const txId = editing.id;
                  const txName =
                    editing.note || STR.cat[editing.category as CategoryKey];

                  setHiddenIds((prev) => new Set(prev).add(txId));
                  setIsDeleting(false);
                  setEditing(null);

                  const timer = setTimeout(() => {
                    deleteFetcher.submit(null, {
                      method: "post",
                      action: `/action/transaction/${txId}/delete`,
                    });
                  }, 5000);

                  showToast(`${txName} dihapus`, {
                    onUndo: () => {
                      clearTimeout(timer);
                      setHiddenIds((prev) => {
                        const next = new Set(prev);
                        next.delete(txId);
                        return next;
                      });
                    },
                  });
                }
              }}
              className="flex-1 px-4 py-3 rounded-2xl border-none bg-brand-red text-white font-bold text-sm cursor-pointer shadow-lg shadow-brand-red/20 min-h-[48px]"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!deletingRecurring}
        onClose={() => setDeletingRecurring(null)}
        title="Hapus Jadwal Rutin"
      >
        <div className="p-1">
          <p className="text-sm text-brand-text-dim mb-6 leading-relaxed">
            Hapus jadwal transaksi rutin{" "}
            <strong>"{deletingRecurring?.name}"</strong>? Transaksi yang sudah
            tercatat sebelumnya tidak akan dihapus.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeletingRecurring(null)}
              className="flex-1 px-4 py-3 rounded-2xl border border-brand-hairline bg-brand-surface-2 text-brand-text font-bold text-sm cursor-pointer min-h-[48px]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (deletingRecurring) {
                  const rtId = deletingRecurring.id;
                  const rtName = deletingRecurring.name;

                  setHiddenRecurringIds((prev) => new Set(prev).add(rtId));
                  setDeletingRecurring(null);

                  const timer = setTimeout(() => {
                    deleteFetcher.submit(null, {
                      method: "post",
                      action: `/action/recurring/${rtId}/delete`,
                    });
                  }, 5000);

                  showToast(`Jadwal "${rtName}" dihapus`, {
                    onUndo: () => {
                      clearTimeout(timer);
                      setHiddenRecurringIds((prev) => {
                        const next = new Set(prev);
                        next.delete(rtId);
                        return next;
                      });
                    },
                  });
                }
              }}
              className="flex-1 px-4 py-3 rounded-2xl border-none bg-brand-red text-white font-bold text-sm cursor-pointer shadow-lg shadow-brand-red/20 min-h-[48px]"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function FilterBar({
  userCategories,
  theme,
}: {
  userCategories: any[];
  theme: Theme;
}) {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();

  // Use the pending URL during navigation so active state updates instantly on click,
  // before the loader resolves. Falls back to current URL when idle.
  const effectiveParams = navigation.location
    ? new URLSearchParams(navigation.location.search)
    : searchParams;

  const currentType = effectiveParams.get("type") ?? "all";
  const currentCat = effectiveParams.get("cat") ?? "all";
  const currentQ = effectiveParams.get("q") ?? "";

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(effectiveParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return s ? `/transaksi?${s}` : "/transaksi";
  };

  const categoryList: { key: string; label: string; icon?: string; color?: string }[] = [
    { key: "all", label: STR.filterAll },
    ...DEFAULT_ACTIVE_CATS.map(c => ({ key: c, label: STR.cat[c] })),
    ...userCategories.map(c => ({ key: c.id, label: c.name, icon: c.icon, color: c.color })),
  ];

  return (
    <div className="flex flex-col gap-2.5 mt-3">
      {/* Search (Form GET) */}
      <Form
        method="get"
        action="/transaksi"
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-input border border-brand-hairline"
      >
        <SearchIcon size={15} className="text-brand-text-mute" />
        <input
          key={currentQ}
          name="q"
          type="search"
          placeholder={STR.searchPlaceholderFull}
          defaultValue={currentQ}
          className="flex-1 bg-transparent border-none outline-none text-brand-text text-sm font-sans min-w-0"
        />
        {currentCat !== "all" && (
          <input type="hidden" name="cat" value={currentCat} />
        )}
        {currentType !== "all" && (
          <input type="hidden" name="type" value={currentType} />
        )}
        <button
          type="submit"
          className="px-3 py-1.25 rounded-full text-[11.5px] font-bold bg-brand-accent-soft border border-brand-accent/20 text-brand-accent cursor-pointer font-sans"
        >
          Cari
        </button>
      </Form>

      {/* Type tabs — active state uses useSearchParams for instant feedback */}
      <div
        className="flex gap-1 p-0.75 rounded-full bg-brand-surface-2 border border-brand-hairline self-start max-w-full"
        role="radiogroup"
        aria-label="Tipe transaksi"
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = currentType === opt.value;
          return (
            <Link
              key={opt.value}
              to={buildHref({ type: opt.value })}
              className={`px-3.5 py-1.25 rounded-full text-[11.5px] font-semibold no-underline whitespace-nowrap transition-all ${
                active
                  ? "bg-brand-surface-solid text-brand-text"
                  : "text-brand-text-dim hover:text-brand-text"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* Category chips — active state uses useSearchParams for instant feedback */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none items-center py-2 px-1 -mx-1 w-[calc(100%+8px)]">
        {categoryList.map((c) => {
          const active = currentCat === c.key;
          const cColor = THEMES[theme].catColor(c.color || c.key);
          return (
            <Link
              key={c.key}
              to={buildHref({ cat: c.key })}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold no-underline whitespace-nowrap transition-all border shrink-0 min-h-[38px] ${
                active
                  ? "bg-brand-accent-soft text-brand-accent border-brand-accent/40 shadow-sm"
                  : "bg-brand-surface-2 text-brand-text-dim border-brand-hairline hover:text-brand-text"
              }`}
              style={
                active && c.key !== "all"
                  ? {
                      background: `color-mix(in srgb, ${cColor} 12%, transparent)`,
                      color: cColor,
                      borderColor: `color-mix(in srgb, ${cColor} 40%, transparent)`,
                    }
                  : undefined
              }
            >
              {c.key !== "all" && <CatIcon cat={(c.icon || c.key) as CategoryKey} size={14} />}
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
