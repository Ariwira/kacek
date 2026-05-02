import { useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import { useState, useRef, useEffect } from "react";
import { DatePicker } from "~/components/date-picker";
import type { Route } from "./+types/_app.tujuan";
import { requireUserId } from "~/lib/auth.server";
import { listGoals, getUserStats, listAccounts } from "~/lib/queries.server";
import {
  THEMES,
  NUM,
  FONT,
  type Theme,
  type ThemeTokens,
} from "~/components/theme";
import { Header } from "~/components/dashboard/header";
import { GlassCard } from "~/components/glass-card";
import { PlusIcon } from "~/components/icons";
import { CheckIcon, TargetIcon, TrashIcon, EditIcon, ChevronDownIcon } from "~/components/icons-extra";
import { BottomSheet } from "~/components/bottom-sheet";
import { RingProgress } from "~/components/ring-progress";
import { STR } from "~/lib/i18n";
import { formatIDR } from "~/lib/format";
import { useToast } from "~/components/toast";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const [goals, stats, accounts] = await Promise.all([
    listGoals(userId).catch(e => { console.error("Goals query error:", e); return []; }),
    getUserStats(userId).catch(e => { console.error("User stats error:", e); return { name: null, email: "" }; }),
    listAccounts(userId).catch(e => { console.error("Accounts query error:", e); return []; }),
  ]);
  const userInitials = ((stats.name || stats.email) ?? "").substring(0, 2).toUpperCase();
  return { goals, userInitials, accounts };
}

type GoalEdit = {
  id?: string;
  name: string;
  targetAmount: number;
  deadline: string;
  emoji: string;
};

export default function TujuanPage() {
  const { goals, userInitials, accounts } = useLoaderData<typeof loader>();
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const dark = theme === "dark";
  const { showToast } = useToast();

  const [editing, setEditing] = useState<GoalEdit | null>(null);
  const [contributing, setContributing] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<{ id: string; name: string; currentAmount: number } | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [refundAccount, setRefundAccount] = useState<string>("");
  const [refundOpen, setRefundOpen] = useState(false);
  
  const deleteFetcher = useFetcher();

  const visibleGoals = goals.filter(g => !hiddenIds.has(g.id));

  return (
    <div className="kc-bg-gradient min-h-screen p-4 md:p-6 lg:p-7 pb-24 md:pb-8 lg:pb-7 text-brand-text font-sans">
      <div className="max-w-[1440px] mx-auto relative">
        <Header theme={theme} T={T} userInitials={userInitials} />

        <div className="flex justify-between items-start mb-3.5 mt-1 gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-brand-text m-0">
              {STR.goalsPageTitle}
            </h1>
            <div className="text-xs text-brand-text-dim mt-1">
              {STR.goalsPageSubtitle(visibleGoals.length)}
            </div>
          </div>
          <button
            type="button"
            className={`px-3.5 py-2.5 rounded-xl border-none bg-gradient-to-br from-brand-accent to-brand-violet ${dark ? "text-[#06180F]" : "text-white"} font-bold text-[13px] cursor-pointer flex items-center gap-1.5 shrink-0 transition-shadow min-h-[44px]`}
            style={{
              boxShadow: dark
                ? `0 8px 22px rgba(52,245,160,0.33)`
                : `0 8px 18px rgba(14,159,110,0.27)`,
            }}
            onClick={() =>
              setEditing({
                name: "",
                targetAmount: 0,
                deadline: "",
                emoji: "",
              })
            }
          >
            <PlusIcon size={14} /> {STR.goalNew}
          </button>
        </div>

        {visibleGoals.length === 0 ? (
          <GlassCard className="p-12 px-6 text-center">
            <div className="w-15 h-15 rounded-full bg-brand-accent-soft text-brand-accent grid place-items-center mx-auto mb-4">
              <TargetIcon size={28} />
            </div>
            <div className="text-base font-bold text-brand-text mb-2">
              {STR.goalsEmpty}
            </div>
            <button
              type="button"
              className={`mt-2 px-5.5 py-3 rounded-2xl border-none bg-gradient-to-br from-brand-accent to-brand-violet ${dark ? "text-[#06180F]" : "text-white"} font-bold text-[13px] cursor-pointer flex items-center gap-1.5 mx-auto transition-shadow min-h-[44px]`}
              style={{
                boxShadow: dark
                  ? `0 10px 28px rgba(52,245,160,0.33)`
                  : `0 10px 24px rgba(14,159,110,0.27)`,
              }}
              onClick={() =>
                setEditing({
                  name: "",
                  targetAmount: 0,
                  deadline: "",
                  emoji: "",
                })
              }
            >
              {STR.goalsEmptyCta}
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3.5 lg:gap-4">
            {visibleGoals.map((g) => {
              const pct =
                g.targetAmount === 0
                  ? 0
                  : Math.min(
                      100,
                      Math.round((g.currentAmount / g.targetAmount) * 100),
                    );
              const remaining = Math.max(0, g.targetAmount - g.currentAmount);
              const daysLeft = g.deadline
                ? Math.ceil(
                    (new Date(g.deadline).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )
                : null;
              return (
                <GlassCard key={g.id} className="p-[18px] md:p-[22px] lg:p-[26px]">
                  <div className="flex gap-3.5 items-start mb-3">
                    <RingProgress
                      pct={pct}
                      size={86}
                      ring={9}
                      color="var(--accent)"
                      trackColor="var(--track)"
                      glow={dark}
                    >
                      <div className="font-mono text-base font-bold text-brand-text tracking-tight">
                        {pct}%
                      </div>
                    </RingProgress>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {g.emoji && (
                          <span className="text-lg">{g.emoji}</span>
                        )}
                        <div className="text-[15px] font-bold text-brand-text whitespace-nowrap overflow-hidden text-ellipsis">
                          {g.name}
                        </div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-brand-text">
                        {formatIDR(g.currentAmount)}
                      </div>
                      <div className="text-[11px] text-brand-text-mute">
                        / {formatIDR(g.targetAmount)} target
                      </div>
                      {daysLeft !== null && (
                        <div
                          className={`text-[11px] mt-1 font-semibold ${
                            daysLeft < 0
                              ? "text-brand-red"
                              : daysLeft < 14
                                ? "text-brand-violet"
                                : "text-brand-text-dim"
                          }`}
                        >
                          {STR.goalDeadlineLeft(daysLeft)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-brand-text-mute mb-2.5">
                    {g.isCompleted 
                      ? "Tujuan Selesai" 
                      : STR.goalRemaining(formatIDR(remaining))}
                  </div>

                  {g.isCompleted ? (
                     <div className="px-3 py-2.5 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text-dim text-center text-[11px] font-bold uppercase tracking-wider">
                       Selesai
                     </div>
                  ) : pct >= 100 ? (
                     <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          className="flex-1 px-3 py-2.25 rounded-xl border-none bg-brand-accent text-[#06180F] font-bold text-xs cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
                          onClick={() => {
                             if(confirm(`Tandai "${g.name}" sebagai selesai dibeli? Uang yang terkumpul sudah digunakan.`)) {
                                 const formData = new FormData();
                                 formData.set("intent", "complete");
                                 deleteFetcher.submit(formData, { method: "post", action: `/action/goal/${g.id}/complete` });
                             }
                          }}
                        >
                          <CheckIcon size={12} /> Beli / Selesai
                        </button>
                        <button
                          type="button"
                          className="flex-1 px-3 py-2.25 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text font-bold text-xs cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
                          onClick={() => setIsDeleting({ id: g.id, name: g.name, currentAmount: g.currentAmount })}
                        >
                          Tarik Dana
                        </button>
                     </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="flex-1 px-3 py-2.25 rounded-xl border-none bg-brand-accent-soft text-brand-accent font-bold text-xs cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
                        onClick={() =>
                          setContributing({ id: g.id, name: g.name })
                        }
                      >
                        {STR.goalContribute}
                      </button>
                      <button
                        type="button"
                        className="w-9.5 rounded-xl border border-brand-hairline bg-brand-surface-2 text-brand-text-dim cursor-pointer grid place-items-center p-0 min-h-[44px]"
                        onClick={() =>
                          setEditing({
                            id: g.id,
                            name: g.name,
                            targetAmount: g.targetAmount,
                            deadline: g.deadline
                              ? new Date(g.deadline).toISOString().slice(0, 10)
                              : "",
                            emoji: g.emoji ?? "",
                          })
                        }
                        aria-label={STR.goalEdit}
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="w-9.5 rounded-xl border border-brand-red/20 bg-brand-red-soft text-brand-red cursor-pointer grid place-items-center p-0 min-h-[44px]"
                        onClick={() => setIsDeleting({ id: g.id, name: g.name, currentAmount: g.currentAmount })}
                        aria-label={STR.goalDelete}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/create goal sheet */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? STR.goalEdit : STR.goalNew}
      >
        {editing && (
          <GoalEditForm
            dark={dark}
            initial={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      {/* Contribute sheet */}
      <BottomSheet
        open={!!contributing}
        onClose={() => setContributing(null)}
        title={`${STR.goalContributeTitle} · ${contributing?.name ?? ""}`}
      >
        {contributing && (
          <ContributeForm
            dark={dark}
            goalId={contributing.id}
            onDone={() => setContributing(null)}
            accounts={accounts}
          />
        )}
      </BottomSheet>

      {/* Custom Goal Delete Confirmation */}
      <BottomSheet
        open={!!isDeleting}
        onClose={() => {
            setIsDeleting(null);
            setRefundAccount("");
        }}
        title="Hapus Tujuan"
      >
        <div className="p-1">
          {isDeleting?.currentAmount && isDeleting.currentAmount > 0 ? (
            <>
               <p className="text-sm text-brand-text-dim mb-4 leading-relaxed">
                  Tujuan <strong>"{isDeleting?.name}"</strong> memiliki tabungan sebesar <strong>{formatIDR(isDeleting.currentAmount)}</strong>. Pilih dompet untuk mengembalikan dana ini:
               </p>
               <div className="relative mb-6">
                 <button
                    type="button"
                    onClick={() => setRefundOpen(!refundOpen)}
                    className="w-full flex items-center gap-3 h-12 px-4 rounded-xl bg-brand-input border border-brand-hairline text-left cursor-pointer transition-all focus:border-brand-accent"
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-brand-accent-soft text-brand-accent grid place-items-center text-[11px] font-bold uppercase">
                      {accounts.find(a => a.id === refundAccount)?.name?.charAt(0) || "?"}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-brand-text truncate">
                      {accounts.find(a => a.id === refundAccount)?.name || "Pilih Akun Pengembalian"}
                    </span>
                    <ChevronDownIcon size={14} className={`text-brand-text-mute shrink-0 transition-transform ${refundOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {refundOpen && (
                     <div className="absolute z-50 mt-2 w-full py-1.5 rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-[overlayIn_0.15s_ease-out] max-h-[200px] overflow-y-auto">
                       {accounts.map(acc => (
                         <button
                            key={acc.id}
                            type="button"
                            onClick={() => { setRefundAccount(acc.id); setRefundOpen(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-brand-text hover:bg-brand-surface-2 transition-colors flex justify-between items-center"
                         >
                           <span>{acc.name}</span>
                           {refundAccount === acc.id && <CheckIcon size={14} className="text-brand-accent" />}
                         </button>
                       ))}
                     </div>
                  )}
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-text-dim mb-6 leading-relaxed">
              Hapus tujuan tabungan <strong>"{isDeleting?.name}"</strong>? Tujuan yang dihapus tidak bisa dikembalikan.
            </p>
          )}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                  setIsDeleting(null);
                  setRefundAccount("");
              }}
              className="flex-1 px-4 py-3 rounded-2xl border border-brand-hairline bg-brand-surface-2 text-brand-text font-bold text-sm cursor-pointer min-h-[48px]"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting?.currentAmount ? isDeleting.currentAmount > 0 && !refundAccount : false}
              onClick={() => {
                if (isDeleting) {
                  const goalId = isDeleting.id;
                  const goalName = isDeleting.name;
                  const amount = isDeleting.currentAmount;
                  const accId = refundAccount;
                  
                  setHiddenIds(prev => new Set(prev).add(goalId));
                  setIsDeleting(null);
                  setRefundAccount("");

                  const timer = setTimeout(() => {
                    const formData = new FormData();
                    if (amount > 0 && accId) {
                        formData.set("refundAccountId", accId);
                    }
                    deleteFetcher.submit(formData, {
                      method: "post",
                      action: `/action/goal/${goalId}/delete`,
                    });
                  }, 5000);

                  showToast(`Tujuan "${goalName}" dihapus`, {
                    onUndo: () => {
                      clearTimeout(timer);
                      setHiddenIds(prev => {
                        const next = new Set(prev);
                        next.delete(goalId);
                        return next;
                      });
                    }
                  });
                }
              }}
              className={`flex-1 px-4 py-3 rounded-2xl border-none font-bold text-sm cursor-pointer shadow-lg min-h-[48px] transition-opacity ${
                  isDeleting?.currentAmount && isDeleting.currentAmount > 0 && !refundAccount
                    ? "bg-brand-red/50 text-white/70 cursor-not-allowed"
                    : "bg-brand-red text-white shadow-brand-red/20"
              }`}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function GoalEditForm({
  dark,
  initial,
  onDone,
}: {
  dark: boolean;
  initial: GoalEdit;
  onDone: () => void;
}) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== "idle";
  const [deadlineDate, setDeadlineDate] = useState(initial.deadline || "");
  const [displayAmount, setDisplayAmount] = useState(
    initial.targetAmount ? new Intl.NumberFormat("id-ID").format(initial.targetAmount) : ""
  );
  const [rawAmount, setRawAmount] = useState(initial.targetAmount?.toString() || "");

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
      action="/action/goal"
      onSubmit={() => setTimeout(onDone, 0)}
      className="flex flex-col gap-4"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormField label={STR.goalName}>
        <input
          name="name"
          type="text"
          required
          maxLength={80}
          defaultValue={initial.name}
          placeholder={STR.goalNamePlaceholder}
          autoFocus={!initial.id}
          className="h-12 px-4 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-semibold outline-none font-sans w-full transition-all focus:border-brand-accent"
        />
      </FormField>
      <div className="flex flex-col gap-1.5">
        {/* Row 1: Labels aligned at the top */}
        <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-3 items-start">
          <span className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold truncate">
            {STR.goalTarget}
          </span>
          <span className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold truncate">
            {STR.goalEmoji}
          </span>
        </div>

        {/* Row 2: Inputs aligned at the same Y axis */}
        <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-3 items-center">
          <div className="flex items-center gap-2 px-4 rounded-xl bg-brand-input border border-brand-hairline h-12 transition-all focus-within:border-brand-accent min-w-0">
            <span className="font-mono text-base text-brand-text-dim font-bold shrink-0">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="0"
              className="flex-1 min-w-0 h-full p-0 border-none bg-transparent text-brand-text text-base font-bold outline-none font-mono"
            />
            <input type="hidden" name="targetAmount" value={rawAmount} />
          </div>
          <div className="min-w-0">
            <input
              name="emoji"
              type="text"
              maxLength={2}
              defaultValue={initial.emoji}
              placeholder={STR.goalEmojiPlaceholder}
              className="h-12 w-full rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-2xl text-center outline-none font-sans transition-all focus:border-brand-accent hover:border-brand-text-dim"
            />
          </div>
        </div>
      </div>
      <FormField label={STR.goalDeadline}>
        <DatePicker
          name="deadline"
          value={deadlineDate}
          onChange={setDeadlineDate}
        />
      </FormField>
      <button
        type="submit"
        disabled={submitting}
        className={`mt-2 px-4 py-3.25 rounded-2xl border-none cursor-pointer font-bold text-sm font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] ${
          submitting ? "wait opacity-70" : "opacity-100"
        } bg-gradient-to-br from-brand-accent to-brand-violet ${
          dark
            ? "text-[#06180F] shadow-[0_10px_28px_rgba(52,245,160,0.33)]"
            : "text-white shadow-[0_10px_24px_rgba(14,159,110,0.27)]"
        }`}
      >
        <CheckIcon size={15} />
        {submitting
          ? "Menyimpan…"
          : initial.id
            ? STR.goalSave
            : STR.goalCreate}
      </button>
    </fetcher.Form>
  );
}

function ContributeForm({
  dark,
  goalId,
  onDone,
  accounts,
}: {
  dark: boolean;
  goalId: string;
  onDone: () => void;
  accounts: any[];
}) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== "idle";
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || "");
  const [accOpen, setAccOpen] = useState(false);
  const accTriggerRef = useRef<HTMLButtonElement>(null);
  
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState("");

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

  if (accounts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-brand-text-mute">
        Anda harus membuat dompet (akun) terlebih dahulu sebelum bisa menabung.
      </div>
    );
  }

  return (
    <fetcher.Form
      method="post"
      action={`/action/goal/${goalId}/contribute`}
      onSubmit={() => setTimeout(onDone, 0)}
      className="p-1 pb-4"
    >
      <div className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold mb-1.5">
        Ambil dari Dompet
      </div>
      <div className="relative mb-4">
         <button
            ref={accTriggerRef}
            type="button"
            onClick={() => setAccOpen(!accOpen)}
            className="w-full flex items-center gap-3 h-12 px-4 rounded-xl bg-brand-input border border-brand-hairline text-left cursor-pointer transition-all focus:border-brand-accent"
          >
            <span className="w-6 h-6 shrink-0 rounded-full bg-brand-accent-soft text-brand-accent grid place-items-center text-[11px] font-bold uppercase">
              {accounts.find(a => a.id === selectedAccount)?.name?.charAt(0) || "?"}
            </span>
            <span className="flex-1 text-sm font-semibold text-brand-text truncate">
              {accounts.find(a => a.id === selectedAccount)?.name || "Pilih Akun"}
            </span>
            <ChevronDownIcon size={14} className={`text-brand-text-mute shrink-0 transition-transform ${accOpen ? 'rotate-180' : ''}`} />
          </button>
          <input type="hidden" name="accountId" value={selectedAccount} />
          
          {accOpen && (
             <div className="absolute z-50 mt-2 w-full py-1.5 rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-[overlayIn_0.15s_ease-out] max-h-[200px] overflow-y-auto">
               {accounts.map(acc => (
                 <button
                    key={acc.id}
                    type="button"
                    onClick={() => { setSelectedAccount(acc.id); setAccOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-brand-text hover:bg-brand-surface-2 transition-colors flex justify-between items-center"
                 >
                   <span>{acc.name} <span className="text-brand-text-dim text-[11px] ml-1">({formatIDR(acc.balance)})</span></span>
                   {selectedAccount === acc.id && <CheckIcon size={14} className="text-brand-accent" />}
                 </button>
               ))}
             </div>
          )}
      </div>

      <div className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold mb-1.5">
        {STR.goalContributeAmount}
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
          pattern="[0-9]*"
          required
          autoFocus
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder="0"
          className="font-mono text-[22px] font-bold text-brand-text bg-transparent border-none outline-none w-full"
        />
        <input type="hidden" name="amount" value={rawAmount} />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className={`w-full px-4 py-3.25 rounded-2xl border-none cursor-pointer font-bold text-sm font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] ${
          submitting ? "wait opacity-70" : "opacity-100"
        } bg-gradient-to-br from-brand-accent to-brand-violet ${
          dark
            ? "text-[#06180F] shadow-[0_10px_28px_rgba(52,245,160,0.33)]"
            : "text-white shadow-[0_10px_24px_rgba(14,159,110,0.27)]"
        }`}
      >
        <PlusIcon size={15} />
        {submitting ? "Menambahkan…" : STR.goalContributeCta}
      </button>
    </fetcher.Form>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold">
        {label}
      </span>
      {children}
    </label>
  );
}
