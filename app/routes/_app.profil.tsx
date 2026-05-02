import { useActionData, useFetcher, useLoaderData, useNavigation, useRouteLoaderData, Form } from "react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Route } from "./+types/_app.profil";
import { requireUserId } from "~/lib/auth.server";
import { getUserStats, listAccounts, createAccount, deleteAccount } from "~/lib/queries.server";
import { db } from "~/lib/db.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Header } from "~/components/dashboard/header";
import { GlassCard } from "~/components/glass-card";
import { THEMES, type Theme, type ThemeTokens } from "~/components/theme";
import { STR } from "~/lib/i18n";
import { useToast } from "~/components/toast";
import { LogoutIcon, PlusIcon, ChevronIcon } from "~/components/icons";
import { TrashIcon, BankIcon, SmartphoneIcon, WalletIcon } from "~/components/icons-extra";
import { BottomSheet, usePortalContainer } from "~/components/bottom-sheet";
import { formatIDR } from "~/lib/format";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const [stats, accounts] = await Promise.all([
    getUserStats(userId),
    listAccounts(userId),
  ]);
  return { stats, accounts };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-name") {
    const name = formData.get("name") as string;
    if (!name || name.length < 2) return { error: "Nama terlalu pendek" };
    await db.update(users).set({ name }).where(eq(users.id, userId));
    return { success: "Nama berhasil diperbarui" };
  }

  if (intent === "create-account") {
    const name = formData.get("name") as string;
    const type = formData.get("type") as any;
    const initialBalance = Number(formData.get("initialBalance") || 0);

    if (!name) return { error: "Nama dompet wajib diisi" };
    await createAccount(userId, name, type, initialBalance);
    return { success: `Dompet "${name}" berhasil dibuat` };
  }

  if (intent === "delete-account") {
    const id = formData.get("id") as string;
    await deleteAccount(userId, id);
    return { success: "Dompet berhasil dihapus" };
  }

  if (intent === "update-password") {
    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) return { error: "Kata sandi lama salah" };

    if (newPassword.length < 6) return { error: "Kata sandi baru minimal 6 karakter" };

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    return { success: "Kata sandi berhasil diperbarui" };
  }

  return null;
}

export default function ProfilPage() {
  const { stats, accounts } = useLoaderData<typeof loader>();
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";
  const T = THEMES[theme];
  const { showToast } = useToast();
  
  const [accOpen, setAccOpen] = useState(false);
  const nameFetcher = useFetcher();
  const passwordFetcher = useFetcher();
  const accFetcher = useFetcher();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const accFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const data = nameFetcher.data as { success?: string; error?: string } | undefined;
    if (data?.success) showToast(data.success, { type: "success" });
    if (data?.error) showToast(data.error, { type: "error" });
  }, [nameFetcher.data, showToast]);

  useEffect(() => {
    const data = passwordFetcher.data as { success?: string; error?: string } | undefined;
    if (data?.success) {
      showToast(data.success, { type: "success" });
      passwordFormRef.current?.reset();
    }
    if (data?.error) showToast(data.error, { type: "error" });
  }, [passwordFetcher.data, showToast]);

  useEffect(() => {
    const data = accFetcher.data as { success?: string; error?: string } | undefined;
    if (data?.success) {
      showToast(data.success, { type: "success" });
      accFormRef.current?.reset();
      setAccOpen(false);
    }
    if (data?.error) showToast(data.error, { type: "error" });
  }, [accFetcher.data, showToast]);

  const initials = (stats.name || stats.email).substring(0, 2).toUpperCase();

  return (
    <div className="kc-bg-gradient min-h-screen p-4 md:p-6 lg:p-7 pb-24 md:pb-8 lg:pb-7 text-brand-text font-sans">
      <div className="max-w-[1440px] mx-auto relative">
        <Header theme={theme} T={T} userInitials={initials} />

        <div className="max-w-[800px] mx-auto">
          <div className="mb-8 mt-4 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-violet to-brand-accent flex items-center justify-center text-3xl font-bold text-brand-bg shadow-2xl mb-4">
              {initials}
            </div>
            <h1 className="text-2xl font-bold m-0">{stats.name || "Pengguna KaCek"}</h1>
            <p className="text-brand-text-dim text-sm mt-1">{stats.email}</p>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-brand-surface-2 border border-brand-hairline text-[11px] font-bold text-brand-text-mute uppercase tracking-wider">
              Bergabung sejak {new Date(stats.joinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <GlassCard className="p-5 flex flex-col items-center justify-center text-center">
              <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-1">Total Transaksi</div>
              <div className="text-3xl font-mono font-bold text-brand-accent">{stats.totalTx}</div>
            </GlassCard>
            <GlassCard className="p-5 flex flex-col items-center justify-center text-center">
              <div className="text-[10px] uppercase font-bold tracking-widest text-brand-text-mute mb-1">Status Akun</div>
              <div className="text-xl font-bold text-brand-text">Premium</div>
            </GlassCard>
          </div>

          <div className="flex flex-col gap-6">
            <section>
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-sm font-bold text-brand-text-mute uppercase tracking-widest m-0">Dompet Saya</h2>
                <button 
                  onClick={() => setAccOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-brand-accent-soft text-brand-accent text-[11px] font-bold border-none cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                >
                  <PlusIcon size={12} /> Tambah
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {accounts.map(acc => (
                  <GlassCard key={acc.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-brand-surface-2 border border-brand-hairline grid place-items-center text-brand-accent shrink-0 shadow-inner">
                        {acc.type === 'bank' ? <BankIcon size={22} /> : acc.type === 'ewallet' ? <SmartphoneIcon size={22} /> : <WalletIcon size={22} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-brand-text truncate">{acc.name}</div>
                        <div className="text-[11px] text-brand-text-mute uppercase tracking-wider font-semibold">{acc.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[13px] font-mono font-bold text-brand-text">{formatIDR(acc.balance)}</div>
                      </div>
                      {accounts.length > 1 && (
                        <accFetcher.Form method="post">
                          <input type="hidden" name="intent" value="delete-account" />
                          <input type="hidden" name="id" value={acc.id} />
                          <button 
                            type="submit" 
                            className="w-8 h-8 rounded-lg bg-brand-red-soft text-brand-red border-none cursor-pointer grid place-items-center hover:bg-brand-red hover:text-white transition-all"
                            onClick={(e) => {
                              if (!confirm(`Hapus dompet "${acc.name}"?`)) e.preventDefault();
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </accFetcher.Form>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-brand-text-mute uppercase tracking-widest mb-3 px-1">Pengaturan Profil</h2>
              <GlassCard className="p-6">
                <nameFetcher.Form method="post" className="flex flex-col gap-4">
                  <input type="hidden" name="intent" value="update-name" />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Nama Lengkap</span>
                    <input 
                      name="name" 
                      type="text" 
                      defaultValue={stats.name || ""} 
                      className="h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none focus:border-brand-accent transition-all"
                    />
                  </label>
                  <button 
                    type="submit" 
                    disabled={nameFetcher.state !== "idle"}
                    className="h-11 rounded-xl bg-brand-surface-solid border border-brand-hairline text-brand-text text-xs font-bold cursor-pointer hover:bg-brand-surface-2 transition-colors active:scale-95 flex items-center justify-center gap-2"
                  >
                    {nameFetcher.state !== "idle" ? "Menyimpan..." : "Simpan Nama"}
                  </button>
                </nameFetcher.Form>
              </GlassCard>
            </section>

            <section>
              <h2 className="text-sm font-bold text-brand-text-mute uppercase tracking-widest mb-3 px-1">Keamanan</h2>
              <GlassCard className="p-6">
                <passwordFetcher.Form method="post" ref={passwordFormRef} className="flex flex-col gap-4">
                  <input type="hidden" name="intent" value="update-password" />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Kata Sandi Lama</span>
                    <input 
                      name="oldPassword" 
                      type="password" 
                      required
                      className="h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none focus:border-brand-accent transition-all"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Kata Sandi Baru</span>
                    <input 
                      name="newPassword" 
                      type="password" 
                      required
                      className="h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none focus:border-brand-accent transition-all"
                    />
                  </label>
                  <button 
                    type="submit" 
                    disabled={passwordFetcher.state !== "idle"}
                    className="h-11 rounded-xl bg-brand-surface-solid border border-brand-hairline text-brand-text text-xs font-bold cursor-pointer hover:bg-brand-surface-2 transition-colors active:scale-95 flex items-center justify-center gap-2"
                  >
                     {passwordFetcher.state !== "idle" ? "Memperbarui..." : "Ubah Kata Sandi"}
                  </button>
                </passwordFetcher.Form>
              </GlassCard>
            </section>

            <section>
              <h2 className="text-sm font-bold text-brand-text-mute uppercase tracking-widest mb-3 px-1">Sesi</h2>
              <GlassCard className="p-6">
                <p className="text-xs text-brand-text-dim mb-4 leading-relaxed">
                  Keluar dari akun Anda di perangkat ini. Anda perlu masuk kembali untuk mengakses data Anda.
                </p>
                <Form method="post" action="/action/logout">
                  <button 
                    type="submit" 
                    className="w-full h-11 rounded-xl bg-brand-red-soft border border-brand-red/20 text-brand-red text-xs font-bold cursor-pointer hover:bg-brand-red hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LogoutIcon size={15} />
                    Keluar dari KaCek
                  </button>
                </Form>
              </GlassCard>
            </section>
          </div>
        </div>
      </div>

      <BottomSheet 
        open={accOpen} 
        onClose={() => setAccOpen(false)}
        title="Tambah Dompet Baru"
      >
        <TambahDompetForm fetcher={accFetcher} formRef={accFormRef} theme={theme} />
      </BottomSheet>
    </div>
  );
}

function TambahDompetForm({ 
  fetcher, 
  formRef, 
  theme 
}: { 
  fetcher: any; 
  formRef: any; 
  theme: "dark" | "light";
}) {
  const portalContainer = usePortalContainer();
  const [type, setType] = useState("cash");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });

  const types = [
    { id: "cash", name: "Uang Tunai (Cash)", icon: WalletIcon },
    { id: "bank", name: "Rekening Bank", icon: BankIcon },
    { id: "ewallet", name: "E-Wallet (Dana/Gopay/OVO)", icon: SmartphoneIcon },
    { id: "other", name: "Lainnya", icon: WalletIcon },
  ];

  const updatePos = useCallback(() => {
    if (!triggerRef.current || !open) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const portalRect = portalContainer?.getBoundingClientRect() || { top: 0, left: 0 };
    setPos({
      top: rect.bottom - portalRect.top + 6,
      left: rect.left - portalRect.left,
      width: rect.width,
    });
  }, [open, portalContainer]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedType = types.find((t) => t.id === type) || types[0];
  const Icon = selectedType.icon;

  return (
    <fetcher.Form method="post" ref={formRef} className="flex flex-col gap-4 p-1">
      <input type="hidden" name="intent" value="create-account" />
      <input type="hidden" name="type" value={type} />
      
      <label className="flex flex-col gap-1.5">
        <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Nama Dompet</span>
        <input 
          name="name" 
          type="text" 
          required
          placeholder="Misal: Bank BCA, Dana, Kas"
          className="h-12 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none focus:border-brand-accent transition-all"
        />
      </label>

      <div className="flex flex-col gap-1.5 relative">
        <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Tipe</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          className={`h-12 px-3.5 rounded-xl bg-brand-input border text-brand-text text-sm font-semibold outline-none flex items-center justify-between transition-all ${
            open ? "border-brand-accent" : "border-brand-hairline hover:border-brand-accent/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="text-brand-accent"><Icon size={16} /></div>
            <span>{selectedType.name}</span>
          </div>
          <div className="text-brand-text-mute transition-transform" style={{ transform: open ? "rotate(180deg)" : "" }}>
            <ChevronIcon size={14} />
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mb-2">
        <span className="text-[10.5px] font-bold text-brand-text-mute uppercase tracking-wider">Saldo Awal (Opsional)</span>
        <div
          className={`flex items-center px-3.5 py-2 rounded-2xl bg-brand-input border border-brand-accent transition-shadow ${
            theme === "dark"
              ? "shadow-[0_0_0_4px_rgba(52,245,160,0.13),0_0_20px_rgba(52,245,160,0.2)]"
              : "shadow-[0_0_0_4px_rgba(14,159,110,0.1)]"
          }`}
        >
          <span className="font-mono text-xl text-brand-text-dim mr-1.5">Rp</span>
          <input 
            name="initialBalance" 
            type="number" 
            placeholder="0"
            className="font-mono text-2xl font-bold text-brand-text tracking-[-0.5px] bg-transparent border-none outline-none w-full py-2"
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={fetcher.state !== "idle"}
        className={`mt-2 flex-1 px-4.5 py-3.25 rounded-2xl border-none cursor-pointer font-bold text-sm tracking-wide font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] bg-gradient-to-br from-brand-accent to-brand-violet ${
          fetcher.state !== "idle" ? "wait opacity-70" : "opacity-100"
        } ${
          theme === "dark"
            ? "text-[#06180F] shadow-[0_10px_28px_rgba(52,245,160,0.33),0_0_0_1px_rgba(52,245,160,0.4)_inset]"
            : "text-white shadow-[0_10px_24px_rgba(14,159,110,0.27)]"
        }`}
      >
        {fetcher.state !== "idle" ? "Menambahkan..." : "Tambah Dompet"}
      </button>

      {open && portalContainer && createPortal(
        <div 
          className="fixed z-[1000] bg-brand-surface-solid border border-brand-hairline rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 pointer-events-auto"
          style={{ 
            top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 6 : 0, 
            left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left : 0, 
            width: triggerRef.current ? triggerRef.current.getBoundingClientRect().width : 200 
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {types.map((t) => {
            const TIcon = t.icon;
            const isSel = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setType(t.id);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                  isSel ? "bg-brand-accent/10 text-brand-accent font-bold" : "text-brand-text hover:bg-brand-surface-2 font-medium"
                }`}
              >
                <TIcon size={16} />
                {t.name}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </fetcher.Form>
  );
}
