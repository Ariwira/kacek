import { useFetcher, useLoaderData, useRouteLoaderData, Await } from "react-router";
import { useState, Suspense, useEffect } from "react";
import type { Route } from "./+types/_app.anggaran";
import { requireUserId } from "~/lib/auth.server";
import { formatYYYYMM, getBudgetView, getUserStats } from "~/lib/queries.server";
import {
  THEMES,
  NUM,
  FONT,
  type Theme,
  type CategoryKey,
  type ThemeTokens,
  CUSTOM_COLORS,
} from "~/components/theme";
import { Header } from "~/components/dashboard/header";
import { GlassCard } from "~/components/glass-card";
import { CatIcon, CUSTOM_ICONS, PlusIcon } from "~/components/icons";
import { CheckIcon, EditIcon, TrashIcon } from "~/components/icons-extra";
import { BottomSheet } from "~/components/bottom-sheet";
import { STR } from "~/lib/i18n";
import { formatIDR, monthNameID } from "~/lib/format";
import { TransactionSkeleton } from "~/components/skeletons";
import { useToast } from "~/components/toast";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const month = formatYYYYMM();
  
  return { 
    month,
    view: getBudgetView(userId, month).catch(e => {
      console.error("Budget View Error:", e);
      return { items: [], totalBudget: 0, totalSpent: 0 };
    }),
    stats: getUserStats(userId).catch(e => {
      console.error("Budget Stats Error:", e);
      return {
        totalTx: 0,
        joinedAt: new Date(),
        name: "",
        email: "",
      };
    }),
  };
}

export default function AnggaranPage() {
  const { month, view, stats } = useLoaderData<typeof loader>();
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const appData = useRouteLoaderData("routes/_app") as { categories?: any[] } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const dark = theme === "dark";
  const customCategories: any[] = appData?.categories ?? [];
  const { showToast } = useToast();

  const [editing, setEditing] = useState<{
    category: CategoryKey;
    name?: string;
    budget: number;
  } | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);

  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null>(null);

  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const categoryDeleteFetcher = useFetcher();

  useEffect(() => {
    if (categoryDeleteFetcher.state === "idle" && categoryDeleteFetcher.data?.success) {
      showToast("Kategori berhasil dihapus", { type: "success" });
      setConfirmDeleteCategory(null);
    } else if (categoryDeleteFetcher.state === "idle" && categoryDeleteFetcher.data?.error) {
      showToast(categoryDeleteFetcher.data.error, { type: "error" });
    }
  }, [categoryDeleteFetcher.state, categoryDeleteFetcher.data, showToast]);

  return (
    <div className="kc-bg-gradient min-h-screen p-4 md:p-6 lg:p-7 pb-24 md:pb-8 lg:pb-7 text-brand-text font-sans">
      <div className="max-w-[1440px] mx-auto relative">
        <Suspense fallback={<Header theme={theme} T={T} userInitials=".." />}>
          <Await resolve={stats}>
            {(resolvedStats) => (
              <Header 
                theme={theme} 
                T={T} 
                userInitials={
                  resolvedStats?.name || resolvedStats?.email 
                    ? (resolvedStats.name || resolvedStats.email).substring(0, 2).toUpperCase()
                    : "??"
                } 
              />
            )}
          </Await>
        </Suspense>

        <div className="mb-3.5 mt-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-brand-text m-0">
            {STR.budgetPageTitle}
          </h1>
          <div className="text-xs text-brand-text-dim mt-1">
            {STR.budgetPageSubtitle(monthNameID() + " " + new Date().getFullYear())}
          </div>
        </div>

        <Suspense fallback={<TransactionSkeleton />}>
          <Await resolve={view}>
            {(resolvedView) => {
              const { items, totalBudget, totalSpent } = resolvedView;
              const remaining = Math.max(0, totalBudget - totalSpent);
              const totalPct = totalBudget === 0 ? 0 : Math.min(999, Math.round((totalSpent / totalBudget) * 100));
              
              return (
                <>
                  {/* Total summary */}
                  <GlassCard
                    className={`p-[18px] md:p-[22px] lg:p-[26px] mb-3.5 ${
                      dark
                        ? "bg-[linear-gradient(135deg,rgba(52,245,160,0.10),rgba(167,139,250,0.08)_60%,rgba(22,24,32,0.62))] border-[rgba(52,245,160,0.2)]"
                        : "bg-[linear-gradient(135deg,rgba(14,159,110,0.08),rgba(92,108,219,0.05)_60%,rgba(255,255,255,0.85))] border-[rgba(14,159,110,0.18)]"
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <SummaryStat label={STR.budgetTotal} value={formatIDR(totalBudget)} accent="var(--text)" />
                      <SummaryStat label={STR.budgetSpent} value={formatIDR(totalSpent)} accent="var(--red)" />
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-brand-text-dim">
                        {STR.budgetRemaining}: {formatIDR(remaining)}
                      </span>
                      <span
                        className="font-mono text-[13px] font-bold"
                        style={{ color: progressColor(totalPct) }}
                      >
                        {totalPct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-brand-track overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, totalPct)}%`,
                          background:
                            totalPct < 80
                              ? `linear-gradient(90deg, var(--accent), var(--violet))`
                              : "var(--red)",
                          boxShadow: dark ? `0 0 16px var(--accent)55` : "none",
                        }}
                      />
                    </div>
                  </GlassCard>

                  {/* Budget cards */}
                  <div className="tour-budget">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-brand-text-mute font-semibold uppercase tracking-wider">Kategori</span>
                      <button
                        type="button"
                        onClick={() => setShowAddCat(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/10 text-brand-accent text-xs font-semibold hover:bg-brand-accent/20 transition-all"
                      >
                        <PlusIcon size={12} />
                        Tambah Kategori
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3.5 lg:gap-4">
                      {items.map((b: any) => {
                        const pColor = progressColor(b.pct);
                        const cColor = THEMES[theme].catColor(b.color || b.category);
                        const customCatObj = customCategories.find((c) => c.id === b.category);
                        const isCustom = !!customCatObj;
                        return (
                          <GlassCard key={b.category} className="p-[18px] md:p-[22px] lg:p-[26px]">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div
                                className="w-[34px] h-[34px] rounded-xl grid place-items-center border"
                                style={{
                                  background: `color-mix(in srgb, ${cColor} 12%, transparent)`,
                                  color: cColor,
                                  borderColor: `color-mix(in srgb, ${cColor} 20%, transparent)`,
                                }}
                              >
                                <CatIcon cat={b.icon || b.category} size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-brand-text whitespace-nowrap overflow-hidden text-ellipsis">
                                  {b.name || STR.cat[b.category as CategoryKey]}
                                </div>
                                <div className="text-[11px] text-brand-text-mute">
                                  {STR.budgetUsed(b.pct)}
                                </div>
                              </div>
                              {isCustom && customCatObj && (
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingCategory({
                                        id: customCatObj.id,
                                        name: customCatObj.name,
                                        icon: customCatObj.icon,
                                        color: customCatObj.color,
                                      })
                                    }
                                    className="w-7 h-7 rounded-lg bg-brand-surface-2 text-brand-text-dim border border-brand-hairline cursor-pointer grid place-items-center hover:text-brand-text transition-all"
                                    title="Edit Kategori"
                                  >
                                    <EditIcon size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteCategory({
                                        id: customCatObj.id,
                                        name: customCatObj.name,
                                      })
                                    }
                                    className="w-7 h-7 rounded-lg bg-brand-red-soft text-brand-red border-none cursor-pointer grid place-items-center hover:bg-brand-red hover:text-white transition-all"
                                    title="Hapus Kategori"
                                  >
                                    <TrashIcon size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="font-mono text-lg font-semibold text-brand-text mb-0.5">
                              {formatIDR(b.spent)}
                            </div>
                            <div className="font-mono text-xs text-brand-text-dim mb-2.5">
                              / {formatIDR(b.budget)}
                            </div>
                            <div className="h-1.5 rounded-full bg-brand-track overflow-hidden mb-3">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, b.pct)}%`,
                                  background: pColor,
                                  boxShadow: dark ? `0 0 8px ${pColor}99` : "none",
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="w-full px-3 py-2.25 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text-dim text-xs font-semibold cursor-pointer font-sans min-h-[44px]"
                              onClick={() =>
                                setEditing({ category: b.category, name: b.name, budget: b.budget })
                              }
                            >
                              {STR.budgetEdit}
                            </button>
                          </GlassCard>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            }}
          </Await>
        </Suspense>
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`${STR.budgetEdit} · ${editing ? (editing.name || STR.cat[editing.category as CategoryKey]) : ""}`}
      >
        {editing && (
          <BudgetEditForm
            dark={dark}
            month={month}
            category={editing.category}
            initial={editing.budget}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={showAddCat}
        onClose={() => setShowAddCat(false)}
        title="Kategori Baru"
      >
        <AddCategoryForm
          dark={dark}
          customCategories={customCategories}
          onDone={() => setShowAddCat(false)}
        />
      </BottomSheet>

      <BottomSheet
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title={`Edit Kategori · ${editingCategory ? editingCategory.name : ""}`}
      >
        {editingCategory && (
          <EditCategoryForm
            dark={dark}
            customCategories={customCategories}
            category={editingCategory}
            onDone={() => {
              setEditingCategory(null);
              showToast("Kategori berhasil diperbarui", { type: "success" });
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet 
        open={!!confirmDeleteCategory} 
        onClose={() => setConfirmDeleteCategory(null)}
        title="Hapus Kategori"
      >
        {confirmDeleteCategory && (
          <div className="p-4 pt-1 flex flex-col gap-6">
            <p className="text-brand-text text-sm leading-relaxed m-0 text-center">
              Apakah Anda yakin ingin menghapus kategori <strong>"{confirmDeleteCategory.name}"</strong>?
              Semua transaksi dan transaksi rutin yang menggunakan kategori ini akan dialihkan ke kategori bawaan <strong>"Lainnya"</strong>, dan anggaran terkait akan dihapus.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteCategory(null)}
                className="flex-1 h-12 rounded-xl bg-brand-surface-2 text-brand-text font-bold text-sm border border-brand-hairline cursor-pointer"
                disabled={categoryDeleteFetcher.state !== "idle"}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  categoryDeleteFetcher.submit(
                    { intent: "delete", id: confirmDeleteCategory.id },
                    { method: "post", action: "/action/category" }
                  );
                }}
                disabled={categoryDeleteFetcher.state !== "idle"}
                className="flex-1 h-12 rounded-xl font-bold text-sm border-none cursor-pointer flex items-center justify-center bg-brand-red text-white"
              >
                 {categoryDeleteFetcher.state !== "idle" ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function progressColor(pct: number) {
  if (pct >= 90) return "var(--red)";
  if (pct >= 70) return "var(--violet)";
  return "var(--accent)";
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-wider uppercase text-brand-text-mute font-bold mb-1.5">
        {label}
      </div>
      <div
        className="font-mono text-[22px] font-bold tracking-tight"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function BudgetEditForm({
  dark,
  month,
  category,
  initial,
  onDone,
}: {
  dark: boolean;
  month: string;
  category: CategoryKey;
  initial: number;
  onDone: () => void;
}) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== "idle";

  const [displayAmount, setDisplayAmount] = useState(
    initial ? new Intl.NumberFormat("id-ID").format(initial) : ""
  );
  const [rawAmount, setRawAmount] = useState(initial?.toString() || "");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setRawAmount(value);
    if (!value) {
      setDisplayAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(parseInt(value));
    setDisplayAmount(formatted);
  };

  return (
    <fetcher.Form
      method="post"
      action="/action/budget"
      onSubmit={() => setTimeout(onDone, 0)}
    >
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="month" value={month} />
      <div className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold mb-1.5">
        Anggaran bulanan (IDR)
      </div>
      <div
        className={`flex items-center px-3.5 py-2.5 rounded-2xl bg-brand-input border border-brand-accent mb-4 transition-shadow ${
          dark
            ? "shadow-[0_0_0_4px_rgba(52,245,160,0.13)]"
            : "shadow-[0_0_0_4px_rgba(14,159,110,0.1)]"
        }`}
      >
        <span className="font-mono text-xl text-brand-text-dim mr-1.5">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          required
          value={displayAmount}
          onChange={handleAmountChange}
          autoFocus
          className="font-mono text-[22px] font-bold text-brand-text bg-transparent border-none outline-none w-full"
        />
        <input type="hidden" name="amount" value={rawAmount || "0"} />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className={`w-full px-4 py-3 rounded-2xl border-none cursor-pointer font-bold text-sm font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] ${
          submitting ? "wait opacity-70" : "opacity-100"
        } bg-gradient-to-br from-brand-accent to-brand-violet ${
          dark
            ? "text-[#06180F] shadow-[0_10px_24px_rgba(52,245,160,0.33)]"
            : "text-white shadow-[0_10px_20px_rgba(14,159,110,0.27)]"
        }`}
      >
        <CheckIcon size={15} />
        {submitting ? "Menyimpan…" : STR.budgetSave}
      </button>
    </fetcher.Form>
  );
}

function AddCategoryForm({
  dark,
  customCategories,
  onDone,
}: {
  dark: boolean;
  customCategories: any[];
  onDone: () => void;
}) {
  const fetcher = useFetcher();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CUSTOM_ICONS[0]?.key ?? "coffee");
  const [color, setColor] = useState(CUSTOM_COLORS[4]?.key ?? "orange");

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onDone();
    }
  }, [fetcher.state, fetcher.data]);

  const usedIcons = new Set(customCategories.map((c) => c.icon));
  const usedColors = new Set(customCategories.map((c) => c.color));

  return (
    <fetcher.Form method="post" action="/action/category" className="space-y-5">
      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Nama Kategori
        </label>
        <input
          name="name"
          autoFocus
          required
          placeholder="cth: Skin Care, Hobi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-sm font-medium focus:border-brand-accent outline-none text-brand-text transition-all"
        />
      </div>

      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Ikon
        </label>
        <div className="grid grid-cols-6 gap-2">
          {CUSTOM_ICONS.filter((i) => !usedIcons.has(i.key)).map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => setIcon(i.key)}
              className={`aspect-square rounded-xl grid place-items-center border-2 transition-all ${
                icon === i.key
                  ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                  : "border-brand-hairline text-brand-text-dim hover:border-brand-text-mute"
              }`}
            >
              <i.Icon size={18} />
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>

      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Warna
        </label>
        <div className="grid grid-cols-6 gap-2">
          {CUSTOM_COLORS.filter((c) => !usedColors.has(c.key)).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={`aspect-square rounded-xl p-1 border-2 transition-all ${
                color === c.key ? "border-brand-accent" : "border-transparent"
              }`}
            >
              <div
                className="w-full h-full rounded-lg"
                style={{ background: dark ? c.dark : c.light }}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </div>

      <button
        type="submit"
        disabled={fetcher.state !== "idle" || !name.trim()}
        className={`w-full px-4 py-3 rounded-2xl border-none cursor-pointer font-bold text-sm font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] bg-linear-to-br from-brand-accent to-brand-violet disabled:opacity-50 ${
          dark
            ? "text-[#06180F] shadow-[0_10px_24px_rgba(52,245,160,0.33)]"
            : "text-white shadow-[0_10px_20px_rgba(14,159,110,0.27)]"
        }`}
      >
        <CheckIcon size={15} />
        {fetcher.state !== "idle" ? "Menyimpan…" : "Buat Kategori"}
      </button>
    </fetcher.Form>
  );
}

function EditCategoryForm({
  dark,
  customCategories,
  category,
  onDone,
}: {
  dark: boolean;
  customCategories: any[];
  category: { id: string; name: string; icon: string; color: string };
  onDone: () => void;
}) {
  const fetcher = useFetcher();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState(category.color);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onDone();
    }
  }, [fetcher.state, fetcher.data]);

  const usedIcons = new Set(
    customCategories.filter((c) => c.id !== category.id).map((c) => c.icon)
  );
  const usedColors = new Set(
    customCategories.filter((c) => c.id !== category.id).map((c) => c.color)
  );

  return (
    <fetcher.Form method="post" action="/action/category" className="space-y-5">
      <input type="hidden" name="intent" value="update" />
      <input type="hidden" name="id" value={category.id} />
      
      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Nama Kategori
        </label>
        <input
          name="name"
          autoFocus
          required
          placeholder="cth: Skin Care, Hobi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-sm font-medium focus:border-brand-accent outline-none text-brand-text transition-all"
        />
      </div>

      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Ikon
        </label>
        <div className="grid grid-cols-6 gap-2">
          {CUSTOM_ICONS.filter((i) => !usedIcons.has(i.key) || i.key === category.icon).map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => setIcon(i.key)}
              className={`aspect-square rounded-xl grid place-items-center border-2 transition-all ${
                icon === i.key
                  ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                  : "border-brand-hairline text-brand-text-dim hover:border-brand-text-mute"
              }`}
            >
              <i.Icon size={18} />
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>

      <div>
        <label className="block text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider mb-1.5">
          Warna
        </label>
        <div className="grid grid-cols-6 gap-2">
          {CUSTOM_COLORS.filter((c) => !usedColors.has(c.key) || c.key === category.color).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={`aspect-square rounded-xl p-1 border-2 transition-all ${
                color === c.key ? "border-brand-accent" : "border-transparent"
              }`}
            >
              <div
                className="w-full h-full rounded-lg"
                style={{ background: dark ? c.dark : c.light }}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </div>

      <button
        type="submit"
        disabled={fetcher.state !== "idle" || !name.trim()}
        className={`w-full px-4 py-3 rounded-2xl border-none cursor-pointer font-bold text-sm font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] bg-linear-to-br from-brand-accent to-brand-violet disabled:opacity-50 ${
          dark
            ? "text-[#06180F] shadow-[0_10px_24px_rgba(52,245,160,0.33)]"
            : "text-white shadow-[0_10px_20px_rgba(14,159,110,0.27)]"
        }`}
      >
        <CheckIcon size={15} />
        {fetcher.state !== "idle" ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
    </fetcher.Form>
  );
}
