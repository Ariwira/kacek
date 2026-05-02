import { useFetcher, useLoaderData, useNavigation, useRouteLoaderData, Await } from "react-router";
import { useState, useEffect, useRef, Suspense } from "react";
import type { Route } from "./+types/_app.dashboard";
import { Header } from "~/components/dashboard/header";
import { SummaryRow } from "~/components/dashboard/summary-row";
import { AnalyticsAndForm } from "~/components/dashboard/analytics-and-form";
import { TxList } from "~/components/dashboard/tx-list";
import { BottomSheet } from "~/components/bottom-sheet";
import { TransactionForm } from "~/components/transaction-form";
import { requireUserId } from "~/lib/auth.server";
import { getDashboardData, processRecurringTransactions, getUserStats } from "~/lib/queries.server";
import { THEMES, type CategoryKey, type Theme } from "~/components/theme";
import { DashboardSkeleton } from "~/components/skeletons";

import { STR } from "~/lib/i18n";
import { useToast } from "~/components/toast";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);

  try {
    // Process recurring transactions
    await processRecurringTransactions(userId);

    const url = new URL(request.url);
    const range = (url.searchParams.get("range") as "week" | "month" | "year") || "month";

    // In React Router 7, simply returning promises in an object enables streaming
    return {
      range,
      data: getDashboardData(userId, range),
      stats: getUserStats(userId),
    };
  } catch (error) {
    console.error("Dashboard Loader Error:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function Dashboard() {
  const loaderData = useLoaderData<typeof loader>();
  
  // Guard for TypeScript
  if (!loaderData) return null;
  const { range, data, stats } = loaderData;
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const { showToast } = useToast();
  
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
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const deleteFetcher = useFetcher();
  const navigation = useNavigation();
  const wasSubmitting = useRef(false);

  useEffect(() => {
    const isSubmittingEdit =
      navigation.state === "submitting" &&
      navigation.formAction?.includes(`/action/transaction/${editing?.id}/update`) === true;
    
    if (isSubmittingEdit) wasSubmitting.current = true;
    if (wasSubmitting.current && navigation.state === "idle") {
      wasSubmitting.current = false;
      setEditing(null);
    }
  }, [navigation.state, navigation.formAction, editing?.id]);

  return (
    <div className="kc-bg-gradient min-h-screen p-4 md:p-6 lg:p-7 pb-24 md:pb-8 lg:pb-7 relative overflow-x-hidden text-brand-text font-sans">
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none transition-opacity ${
          theme === "dark" ? "opacity-[0.35]" : "opacity-[0.5]"
        }`}
        style={{
          backgroundImage:
            theme === "dark"
              ? "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)"
              : "radial-gradient(rgba(20,30,60,0.04) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      
      <div className="max-w-[1440px] mx-auto relative">
        <Suspense fallback={<Header theme={theme} userInitials=".." T={T} />}>
          <Await resolve={stats}>
            {(resolvedStats) => (
              <Header 
                theme={theme} 
                userInitials={(resolvedStats.name || resolvedStats.email).substring(0, 2).toUpperCase()} 
                T={T} 
              />
            )}
          </Await>
        </Suspense>

        <Suspense fallback={<DashboardSkeleton />}>
          <Await resolve={data}>
            {(resolvedData) => (
              <>
                <SummaryRow theme={theme} data={resolvedData.summary} />
                <AnalyticsAndForm
                  theme={theme}
                  breakdown={resolvedData.breakdown}
                  totalForRange={resolvedData.totalForRange}
                  expenseDelta={resolvedData.expenseDelta}
                  range={range}
                />
                <TxList
                  transactions={resolvedData.recent.filter(tx => !hiddenIds.has(String(tx.id)))}
                  totalCount={resolvedData.totalCount}
                  netThisWeek={resolvedData.netThisWeek}
                  theme={theme}
                  onEdit={(tx) =>
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
              </>
            )}
          </Await>
        </Suspense>
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={STR.editTx}
      >
        {editing && (
          <TransactionForm
            dark={theme === "dark"}
            mode="edit"
            compact
            defaults={editing}
            onDelete={() => setIsDeleting(true)}
            onFormSuccess={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        title={STR.deleteTxConfirm}
      >
        <div className="p-1">
          <p className="text-sm text-brand-text-dim mb-6 leading-relaxed">
            Data transaksi ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
                  const txName = editing.note || STR.cat[editing.category as CategoryKey];
                  setHiddenIds(prev => new Set(prev).add(txId));
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
                      setHiddenIds(prev => {
                        const next = new Set(prev);
                        next.delete(txId);
                        return next;
                      });
                    }
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
