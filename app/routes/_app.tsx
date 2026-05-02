import { Outlet, useNavigation, useRouteLoaderData, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/_app";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { users, categories as categoriesTable } from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureUserAccounts, listNotifications } from "~/lib/queries.server";
import { type Theme } from "~/components/theme";
import { BottomNav } from "~/components/bottom-nav";
import { FAB } from "~/components/fab";
import { BottomSheet } from "~/components/bottom-sheet";
import { TransactionForm } from "~/components/transaction-form";
import { BellIcon } from "~/components/icons";
import { CheckIcon } from "~/components/icons-extra";
import { formatIDR } from "~/lib/format";
import { useFetcher } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const [rows, accounts, notifications, categories] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId)),
    ensureUserAccounts(userId),
    listNotifications(userId),
    db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId)).orderBy(desc(categoriesTable.createdAt)),
  ]);
  return { user: rows[0] ?? null, accounts, notifications, categories };
}

export default function AppLayout() {
  const rootData = useRouteLoaderData("routes/_app") as { notifications: any[] } | undefined;
  const notifications = rootData?.notifications ?? [];
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const [addOpen, setAddOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const wasSubmitting = useRef(false);

  // Listener for custom event to open notifications from Header
  useEffect(() => {
    const handler = () => setNotifOpen(true);
    window.addEventListener("open-notifications", handler);
    return () => window.removeEventListener("open-notifications", handler);
  }, []);

  // Auto-close the sheet when the action completes successfully.
  useEffect(() => {
    const isSubmittingTx =
      navigation.state === "submitting" &&
      navigation.formAction?.startsWith("/action/transaction") === true;
    if (isSubmittingTx) wasSubmitting.current = true;
    if (wasSubmitting.current && navigation.state === "idle") {
      wasSubmitting.current = false;
      setAddOpen(false);
    }
  }, [navigation.state, navigation.formAction]);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[name="q"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const location = useLocation();

  return (
    <>
      <Outlet />
      <FAB onClick={() => setAddOpen(true)} dark={theme === "dark"} />
      <BottomNav />
      
      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah transaksi"
      >
        <div className="p-1">
          <TransactionForm
            dark={theme === "dark"}
            mode="add"
            compact
            onFormSuccess={() => setAddOpen(false)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notifikasi"
      >
        <div className="flex flex-col gap-3 p-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-brand-surface-2 grid place-items-center mx-auto mb-4">
                <BellIcon size={24} className="text-brand-text-mute" />
              </div>
              <p className="text-sm text-brand-text-mute">Belum ada notifikasi baru.</p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  n.isRead 
                    ? "bg-brand-surface-1 border-brand-hairline opacity-60" 
                    : "bg-brand-surface-2 border-brand-accent/20"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-bold mb-1 ${n.isRead ? "text-brand-text-dim" : "text-brand-text"}`}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-brand-text-dim leading-relaxed">
                      {n.message}
                    </p>
                    <div className="text-[10px] text-brand-text-mute mt-2">
                      {new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => fetcher.submit({ id: n.id }, { method: "post", action: "/action/notification/read" })}
                      className="w-8 h-8 rounded-lg bg-brand-accent-soft text-brand-accent border-none cursor-pointer grid place-items-center transition-all hover:bg-brand-accent hover:text-white"
                      title="Tandai dibaca"
                    >
                      <CheckIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </>
  );
}
