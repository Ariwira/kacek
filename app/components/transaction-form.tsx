import { useFetcher, useRouteLoaderData } from "react-router";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CatIcon,
  PlusIcon,
  PaperclipIcon,
  CUSTOM_ICONS,
  CameraIcon,
  ImageIcon,
} from "~/components/icons";
import { CheckIcon, TrashIcon, AlertTriangleIcon, ChevronDownIcon } from "~/components/icons-extra";
import { DatePicker } from "~/components/date-picker";
import { usePortalContainer } from "~/components/bottom-sheet";
import { NUM, type CategoryKey, type ThemeTokens, CUSTOM_COLORS, THEMES } from "~/components/theme";
import { STR } from "~/lib/i18n";
import { formatIDR, monthNameID } from "~/lib/format";
import { createWorker } from "tesseract.js";
import { ScanIcon } from "./icons-extra";
import { useToast } from "~/components/toast";
import type { Category } from "~/db/schema";

const CATEGORY_OPTIONS: CategoryKey[] = [
  "food",
  "transport",
  "shopping",
  "bills",
  "income",
];

export type TransactionFormDefaults = {
  id?: string;
  amount?: number;
  type?: "expense" | "income";
  category?: CategoryKey;
  accountId?: string;
  note?: string;
  receiptUrl?: string | null;
  date?: string; // YYYY-MM-DD
};

export function TransactionForm(props: {
  T?: ThemeTokens;
  dark: boolean;
  mode?: "add" | "edit";
  defaults?: TransactionFormDefaults;
  onDelete?: () => void;
  compact?: boolean;
  customAction?: string;
  onFormSuccess?: () => void;
}) {
  const appData = useRouteLoaderData("routes/_app") as
    | { accounts: any[]; categories: Category[] }
    | undefined;

  return (
    <TransactionFormInner
      {...props}
      accountsList={appData?.accounts ?? []}
      customCategories={appData?.categories ?? []}
    />
  );
}

function TransactionFormInner(props: {
  T?: ThemeTokens;
  dark: boolean;
  mode?: "add" | "edit";
  defaults?: TransactionFormDefaults;
  onDelete?: () => void;
  compact?: boolean;
  customAction?: string;
  onFormSuccess?: () => void;
  accountsList: any[];
  customCategories: Category[];
}) {
  const {
    dark,
    mode = "add",
    defaults,
    onDelete,
    compact = false,
    customAction,
    onFormSuccess,
    accountsList,
    customCategories,
  } = props;

  const fetcher = useFetcher();
  const { showToast } = useToast();

  const isEdit = mode === "edit" && defaults?.id;
  const [selectedCat, setSelectedCat] = useState<string>(defaults?.category ?? "food");
  
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("coffee");
  const [newCatColor, setNewCatColor] = useState("amber");
  
  const catFetcher = useFetcher();
  
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onFormSuccess?.();
    }
  }, [fetcher.state, fetcher.data, onFormSuccess]);

  useEffect(() => {
    if (catFetcher.state === "idle" && catFetcher.data?.success) {
      setShowAddCat(false);
      setNewCatName("");
    }
  }, [catFetcher.state, catFetcher.data]);

  const currentCatData = customCategories.find(c => c.id === selectedCat) || {
    name: STR.cat[selectedCat as CategoryKey] || selectedCat,
    icon: selectedCat,
    color: selectedCat,
  };

  const T: ThemeTokens = THEMES[dark ? "dark" : "light"];
  const catColor = T.catColor(currentCatData.color);

  const action = customAction || (isEdit
    ? `/action/transaction/${defaults.id}/update`
    : "/action/transaction");

  const submitting = fetcher.state !== "idle";
  const error = fetcher.data?.error as string | undefined;

  const todayISO = defaults?.date ?? new Date().toISOString().slice(0, 10);

  // Filter accounts: show active ones, PLUS the currently selected archived one (if any)
  const activeAccounts = accountsList.filter(acc => !acc.isArchived || acc.id === defaults?.accountId);

  // Custom States
  const [selectedAccount, setSelectedAccount] = useState<string>(defaults?.accountId ?? activeAccounts[0]?.id ?? "");
  const [catOpen, setCatOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [isRecurring, setIsRecurring] = useState(false);
  
  const accTriggerRef = useRef<HTMLButtonElement>(null);
  const accDropdownRef = useRef<HTMLDivElement>(null);
  const [accPos, setAccPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 260 });

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMenuOpen, setScanMenuOpen] = useState(false);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanGalleryRef = useRef<HTMLInputElement>(null);
  const scanBtnRef = useRef<HTMLButtonElement>(null);
  const scanMenuRef = useRef<HTMLDivElement>(null);
  const [scanMenuPos, setScanMenuPos] = useState({ top: 0, left: 0 });

  const handleScan = async (file: File) => {
    if (!file) return;

    const MAX_BYTES = 15 * 1024 * 1024; // Allow up to 15MB for phone cameras
    if (file.size > MAX_BYTES) {
      showToast("Foto terlalu besar (maks 15MB). Coba kompres dulu.", { type: "error" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast("File harus berupa gambar.", { type: "error" });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      // Read file safely using FileReader first
      const rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
        reader.readAsDataURL(file);
      });

      // Compress and resize image using Canvas for better OCR accuracy and speed
      const dataUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            const MAX_DIM = 1000; // Reduced for better memory safety on all devices

            if (width > height && width > MAX_DIM) {
              height = Math.round(height * (MAX_DIM / width));
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width = Math.round(width * (MAX_DIM / height));
              height = MAX_DIM;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            
            // Draw image without filter to save memory and prevent crash on large photos
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.6));
          } catch (e) {
            console.error("Canvas error:", e);
            resolve(rawDataUrl); // Fallback to raw if canvas fails
          }
        };
        img.onerror = () => {
          console.error("Image load error for canvas");
          resolve(rawDataUrl); // Fallback to raw
        };
        img.src = rawDataUrl;
      });

      worker = await createWorker('ind', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(dataUrl);

      // Amount extraction with tiered priority:
      // Tier 1 — "Grand Total" / "Total Bayar" line (beats subtotal, taxes, etc.)
      // Tier 2 — any line with total/jumlah/bayar keyword that isn't a subtotal
      // Tier 3 — largest number seen overall (fallback)
      const lines = text.split('\n');
      let foundAmount = 0;       // tier 3: largest number overall
      let totalAmount = 0;       // tier 2: keyword match excl. subtotal
      let grandTotalAmount = 0;  // tier 1: "grand" or explicit grand total line

      const parseAmount = (str: string): number => {
        // Find largest number sequence, allowing dots/spaces as thousands separators
        const numbers = str.match(/\d{1,3}(?:[., ]\d{3})+|\d{4,}/g);
        if (!numbers) return 0;
        let max = 0;
        for (const num of numbers) {
          const clean = num.replace(/[,. ]/g, "");
          const val = parseInt(clean);
          if (!isNaN(val) && val >= 1000 && val < 50_000_000 && val > max) {
            max = val;
          }
        }
        return max;
      };

      let lastLineWasTotal = false;
      let lastLineWasGrand = false;

      for (const line of lines) {
        const cleanLine = line.replace(/[|[\]]/g, "").trim();
        if (!cleanLine) continue;

        const isGrand = /grand\s*total|total\s*bayar|grand\s*bill|total\s*bill/i.test(cleanLine);
        const isTotal = /total|jumlah|bayar|tagihan|net|summary/i.test(cleanLine);
        const isSubtotal = /sub\s*total|subtotal/i.test(cleanLine);

        const val = parseAmount(cleanLine);

        if (val) {
          if (val > foundAmount) foundAmount = val;

          if ((isGrand || lastLineWasGrand) && val > grandTotalAmount) {
            grandTotalAmount = val;
          } else if ((isTotal || lastLineWasTotal) && !isSubtotal && val > totalAmount) {
            totalAmount = val;
          }
        }

        // Carry forward the keyword if no value was found on this line
        if (!val) {
          if (isGrand) lastLineWasGrand = true;
          else if (isTotal && !isSubtotal) lastLineWasTotal = true;
        } else {
          lastLineWasGrand = false;
          lastLineWasTotal = false;
        }
      }

      const finalAmount = grandTotalAmount || totalAmount || foundAmount;

      if (finalAmount > 0) {
        setRawAmount(finalAmount.toString());
        setDisplayAmount(new Intl.NumberFormat("id-ID").format(finalAmount));
      }

      const lowerText = text.toLowerCase();
      const catKeywords = {
        food: ["makan", "minum", "kfc", "mcd", "bakso", "resto", "coffee", "cafe", "warung", "bakery", "pizza", "starbucks", "burger", "nasi", "mie", "grabfood", "gofood"],
        transport: ["bbm", "pertamina", "shell", "gojek", "grab", "maxim", "parkir", "tol", "kereta", "kai", "pesawat", "travel", "ojek", "bensin"],
        bills: ["listrik", "pln", "pdam", "internet", "wifi", "telkom", "pulsa", "indihome", "token", "asuransi", "bpjs", "tagihan"],
        entertainment: ["bioskop", "cinema", "xxi", "cgv", "netflix", "spotify", "game", "steam", "topup", "karaoke", "wisata", "tiket"],
        shopping: ["indomaret", "alfamart", "market", "mall", "super", "belanja", "tokopedia", "shopee", "lazada", "bukalapak", "fashion", "baju", "sepatu", "uniqllo", "h&m"],
        health: ["apotek", "rs", "rumah sakit", "klinik", "dokter", "obat", "kimia farma", "halodoc", "prodia"],
        education: ["sekolah", "kuliah", "kursus", "buku", "gramedia", "udemy", "coursera", "bimbel", "spp"],
        gift: ["kado", "hadiah", "donasi", "sedekah", "zakat", "infak", "baznas", "kitabisa"],
        investment: ["saham", "reksadana", "crypto", "binance", "ajaib", "bibit", "emas", "logam mulia"],
      };

      for (const [cat, keywords] of Object.entries(catKeywords)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
          setSelectedCat(cat as CategoryKey);
          break;
        }
      }

      const merchantLine = lines.find(l => {
        const cleanAlpha = l.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const originalClean = l.trim();
        const hasLetters = /[a-zA-Z]{3,}/.test(cleanAlpha);
        return hasLetters && cleanAlpha.length > 3 && !/[0-9]{5,}/.test(originalClean) && !/total|jumlah|tanggal|tgl|cash|kembali|tunai|struk/i.test(originalClean);
      });
      
      if (merchantLine) {
        const noteInput = document.querySelector('input[name="note"]') as HTMLInputElement;
        if (noteInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          nativeSetter?.call(noteInput, merchantLine.trim().substring(0, 50));
          noteInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      if (finalAmount === 0 && !merchantLine) {
        showToast("Tidak ada teks yang terbaca. Coba foto lebih dekat.", { type: "info" });
      }
    } catch (err) {
      console.error("OCR Error:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const msg = errStr || "Gagal memproses gambar.";
      showToast(`Scan gagal: ${msg.substring(0, 80)}`, { type: "error" });
    } finally {
      try { await worker?.terminate(); } catch {}
      setIsScanning(false);
      if (scanCameraRef.current) scanCameraRef.current.value = "";
      if (scanGalleryRef.current) scanGalleryRef.current.value = "";
    }
  };

  const currentAcc = activeAccounts.find((a) => a.id === selectedAccount) || activeAccounts[0];

  const updateAccPos = useCallback(() => {
    if (!accTriggerRef.current || !accOpen) return;
    const rect = accTriggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = 200;
    const openUp = spaceBelow < dropdownH;
    setAccPos({
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: rect.width,
    });
  }, [accOpen]);

  useEffect(() => {
    if (accOpen) {
      updateAccPos();
      window.addEventListener("scroll", updateAccPos, true);
      window.addEventListener("resize", updateAccPos);
    }
    return () => {
      window.removeEventListener("scroll", updateAccPos, true);
      window.removeEventListener("resize", updateAccPos);
    };
  }, [accOpen, updateAccPos]);

  useEffect(() => {
    if (!accOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        accTriggerRef.current?.contains(target) ||
        accDropdownRef.current?.contains(target)
      ) return;
      setAccOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accOpen]);

  useEffect(() => {
    if (!accOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [accOpen]);
  const [displayAmount, setDisplayAmount] = useState(
    defaults?.amount ? new Intl.NumberFormat("id-ID").format(defaults.amount) : ""
  );
  const [rawAmount, setRawAmount] = useState(defaults?.amount?.toString() ?? "");
  const portalContainer = usePortalContainer() || (typeof document !== 'undefined' ? document.body : null);
  
  if (!portalContainer && (catOpen || showAddCat)) return null; // Safety check
  
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
  
  const catTriggerRef = useRef<HTMLButtonElement>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const [catPos, setCatPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 260 });

  const updateCatPos = useCallback(() => {
    if (!catTriggerRef.current || !catOpen) return;
    const rect = catTriggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = 320;
    const openUp = spaceBelow < dropdownH;
    setCatPos({
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: rect.width,
    });
  }, [catOpen]);

  useEffect(() => {
    if (!catOpen) return;
    updateCatPos();
    window.addEventListener("scroll", updateCatPos, true);
    window.addEventListener("resize", updateCatPos);
    return () => {
      window.removeEventListener("scroll", updateCatPos, true);
      window.removeEventListener("resize", updateCatPos);
    };
  }, [catOpen, updateCatPos]);

  useEffect(() => {
    if (!catOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        catTriggerRef.current?.contains(target) ||
        catDropdownRef.current?.contains(target)
      ) return;
      setCatOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [catOpen]);

  useEffect(() => {
    if (!catOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCatOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [catOpen]);

  // Close scan menu on outside click or Escape
  useEffect(() => {
    if (!scanMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (scanBtnRef.current?.contains(e.target as Node) ||
          scanMenuRef.current?.contains(e.target as Node)) return;
      setScanMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setScanMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [scanMenuOpen]);

  const openScanMenu = () => {
    if (!scanBtnRef.current) return;
    const rect = scanBtnRef.current.getBoundingClientRect();
    setScanMenuPos({ top: rect.bottom + 6, left: rect.left });
    setScanMenuOpen(true);
  };

  const scanMenu = scanMenuOpen && createPortal(
    <div
      ref={scanMenuRef}
      className="fixed z-[9999] py-1.5 rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-in fade-in zoom-in-95 duration-150 origin-top-left"
      style={{ top: scanMenuPos.top, left: scanMenuPos.left, minWidth: 160, pointerEvents: "auto" }}
    >
      <button
        type="button"
        onClick={() => { setScanMenuOpen(false); scanCameraRef.current?.click(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-text hover:bg-brand-surface-2 transition-colors text-left"
      >
        <CameraIcon size={15} className="text-brand-accent shrink-0" />
        <span className="font-semibold">Ambil Foto</span>
      </button>
      <button
        type="button"
        onClick={() => { setScanMenuOpen(false); scanGalleryRef.current?.click(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-text hover:bg-brand-surface-2 transition-colors text-left"
      >
        <ImageIcon size={15} className="text-brand-accent shrink-0" />
        <span className="font-semibold">Pilih dari Galeri</span>
      </button>
    </div>,
    portalContainer ?? document.body
  );

  return (
    <>
    <fetcher.Form method="post" action={action} encType="multipart/form-data">
      {compact ? (
        <div className="flex items-center justify-between mb-4">
          {!isEdit && (
            <div className="flex items-center gap-2">
              <input type="file" ref={scanCameraRef} className="hidden" accept="image/*" capture="environment"
                onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])} />
              <input type="file" ref={scanGalleryRef} className="hidden" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])} />
              <button
                ref={scanBtnRef}
                type="button"
                onClick={openScanMenu}
                disabled={isScanning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-brand-accent/20 ${
                  isScanning ? "opacity-50 cursor-wait" : "cursor-pointer"
                }`}
              >
                <ScanIcon size={12} />
                {isScanning ? `${scanProgress}%` : "Scan Struk"}
              </button>
              {scanMenu}
            </div>
          )}
          <TypeToggle defaultValue={defaults?.type ?? "expense"} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="text-base font-bold text-brand-text tracking-[-0.2px]">
                {isEdit ? "Edit transaksi" : STR.addTransaction}
              </div>
              {!isEdit && (
                <>
                  <input type="file" ref={scanCameraRef} className="hidden" accept="image/*" capture="environment"
                    onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])} />
                  <input type="file" ref={scanGalleryRef} className="hidden" accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])} />
                  <button
                    ref={scanBtnRef}
                    type="button"
                    onClick={openScanMenu}
                    disabled={isScanning}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-brand-accent/20 ${
                      isScanning ? "opacity-50 cursor-wait" : "cursor-pointer"
                    }`}
                  >
                    <ScanIcon size={12} />
                    {isScanning ? `Scanning ${scanProgress}%` : "Scan Struk"}
                  </button>
                  {scanMenu}
                </>
              )}
            </div>
            <TypeToggle defaultValue={defaults?.type ?? "expense"} />
          </div>
          <div className="text-xs text-brand-text-dim mb-4.5">
            {isScanning ? "Menganalisis teks pada struk belanja Anda..." : STR.addTransactionTagline}
          </div>
        </>
      )}

      {isScanning && compact && (
        <div className="mb-4 p-2.5 rounded-xl bg-brand-accent/5 border border-brand-accent/20 text-brand-accent text-[11px] font-medium flex items-center gap-2 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
          Menganalisis struk... {scanProgress}%
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-brand-red-soft border border-brand-red/20 text-brand-red text-xs font-bold animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
          <AlertTriangleIcon size={14} /> {error}
        </div>
      )}

      {/* Account Selection */}
      <div className="mb-4 relative">
        <Lab>Dompet / Akun</Lab>
        <button
          ref={accTriggerRef}
          type="button"
          onClick={() => {
            if (!accOpen && accTriggerRef.current) {
              const rect = accTriggerRef.current.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              const dropdownH = 200;
              const openUp = spaceBelow < dropdownH;
              setAccPos({
                top: openUp ? undefined : rect.bottom + 6,
                bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
                left: rect.left,
                width: rect.width,
              });
            }
            setAccOpen(!accOpen);
          }}
          className="w-full flex items-center gap-3 h-11 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-left cursor-pointer transition-all active:scale-[0.98]"
        >
          <span className="w-5 h-5 shrink-0 rounded-full bg-brand-accent-soft text-brand-accent grid place-items-center text-[10px] font-bold uppercase">
            {activeAccounts.find(a => a.id === selectedAccount)?.name?.charAt(0) || "?"}
          </span>
          <span className="flex-1 text-sm font-semibold text-brand-text truncate">
            {activeAccounts.find(a => a.id === selectedAccount)?.name || "Pilih Akun"}
            {activeAccounts.find(a => a.id === selectedAccount)?.isArchived ? " (Arsip)" : ""}
          </span>
          <ChevronDownIcon size={14} className={`text-brand-text-mute shrink-0 transition-transform ${accOpen ? 'rotate-180' : ''}`} />
        </button>
        <input type="hidden" name="accountId" value={selectedAccount} />

        {accOpen && createPortal(
          <div
            ref={accDropdownRef}
            className="fixed z-[9999] py-1.5 rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-[overlayIn_0.15s_ease-out] max-h-[200px] overflow-y-auto backdrop-blur-xl"
            style={{
              pointerEvents: "auto",
              top: accPos.top != null ? `${accPos.top}px` : undefined,
              bottom: accPos.bottom != null ? `${accPos.bottom}px` : undefined,
              left: `${accPos.left}px`,
              width: `${accPos.width}px`,
              minWidth: 200,
            }}
          >
            {activeAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(a.id);
                  setAccOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-brand-surface-2 transition-colors ${
                  selectedAccount === a.id ? "bg-brand-accent-soft" : ""
                }`}
              >
                <span className="text-[13px] font-semibold text-brand-text">
                  {a.name}
                  {a.isArchived && <span className="text-[10px] bg-brand-surface-2 px-1.5 py-0.5 rounded-full ml-2 opacity-70">Arsip</span>}
                </span>
                {selectedAccount === a.id && <CheckIcon size={14} className="ml-auto text-brand-accent" />}
              </button>
            ))}
          </div>,
          portalContainer ?? document.body
        )}
      </div>

      {/* Amount */}
      <div className="mb-3">
        <Lab>{STR.amount}</Lab>
        <div
          className={`flex items-center px-3.5 py-2 rounded-2xl bg-brand-input border border-brand-accent transition-shadow ${
            dark
              ? "shadow-[0_0_0_4px_rgba(52,245,160,0.13),0_0_20px_rgba(52,245,160,0.2)]"
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
            placeholder="0"
            value={displayAmount}
            onChange={handleAmountChange}
            autoFocus={!isEdit}
            className="font-mono text-2xl font-bold text-brand-text tracking-[-0.5px] bg-transparent border-none outline-none w-full py-2"
          />
          <input type="hidden" name="amount" value={rawAmount} />
          <span className="ml-auto text-[11.5px] text-brand-text-mute font-mono">
            IDR
          </span>
        </div>
      </div>

      {/* Category + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Custom Category Dropdown */}
        <div className="min-w-0 relative">
          <Lab>{STR.category}</Lab>
          <button
            ref={catTriggerRef}
            type="button"
            onClick={() => {
              if (!catOpen && catTriggerRef.current) {
                const rect = catTriggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const dropdownH = 320;
                const openUp = spaceBelow < dropdownH;
                setCatPos({
                  top: openUp ? undefined : rect.bottom + 6,
                  bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
                  left: rect.left,
                  width: rect.width,
                });
              }
              setCatOpen(!catOpen);
            }}
            className="w-full flex items-center gap-3 h-12 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-left cursor-pointer transition-all active:scale-[0.98]"
          >
            <span
              className="w-6 h-6 shrink-0 rounded-lg grid place-items-center"
              style={{
                background: `color-mix(in srgb, ${catColor} 13%, transparent)`,
                color: catColor,
              }}
            >
              <CatIcon cat={currentCatData.icon} size={14} />
            </span>
            <span className="flex-1 text-sm font-semibold text-brand-text truncate">
              {currentCatData.name}
            </span>
            <ChevronDownIcon size={14} className={`text-brand-text-mute shrink-0 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <input type="hidden" name="category" value={selectedCat} />

          {catOpen && createPortal(
            <div
              ref={catDropdownRef}
              className="fixed z-[9999] py-1.5 rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-[overlayIn_0.15s_ease-out] max-h-[320px] overflow-y-auto backdrop-blur-xl"
              style={{
                pointerEvents: "auto",
                top: catPos.top != null ? `${catPos.top}px` : undefined,
                bottom: catPos.bottom != null ? `${catPos.bottom}px` : undefined,
                left: `${catPos.left}px`,
                width: `${catPos.width}px`,
                minWidth: 200,
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold text-brand-text-mute uppercase tracking-wider">Bawaan</div>
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCat(c);
                    setCatOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-surface-2 transition-colors text-left"
                >
                  <span
                    className="w-5 h-5 rounded-md grid place-items-center"
                    style={{
                      background: `color-mix(in srgb, ${T.catColor(c)} 13%, transparent)`,
                      color: T.catColor(c),
                    }}
                  >
                    <CatIcon cat={c} size={12} />
                  </span>
                  <span className="text-sm font-medium text-brand-text">{STR.cat[c as CategoryKey]}</span>
                  {selectedCat === c && <CheckIcon size={14} className="ml-auto text-brand-accent" />}
                </button>
              ))}
              
              {customCategories.length > 0 && (
                <>
                  <div className="px-3 py-1.5 mt-1 text-[10px] font-bold text-brand-text-mute uppercase tracking-wider border-t border-brand-hairline pt-3">Kustom</div>
                  {customCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCat(c.id);
                        setCatOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-surface-2 transition-colors text-left"
                    >
                      <span
                        className="w-5 h-5 rounded-md grid place-items-center"
                        style={{
                          background: `color-mix(in srgb, ${T.catColor(c.color)} 13%, transparent)`,
                          color: T.catColor(c.color),
                        }}
                      >
                        <CatIcon cat={c.icon} size={12} />
                      </span>
                      <span className="text-sm font-medium text-brand-text">{c.name}</span>
                      {selectedCat === c.id && <CheckIcon size={14} className="ml-auto text-brand-accent" />}
                    </button>
                  ))}
                </>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setCatOpen(false);
                  setShowAddCat(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 border-t border-brand-hairline hover:bg-brand-accent/5 transition-colors text-left group"
              >
                <span className="w-5 h-5 rounded-md grid place-items-center bg-brand-accent/10 text-brand-accent group-hover:bg-brand-accent/20">
                  <PlusIcon size={12} />
                </span>
                <span className="text-sm font-semibold text-brand-accent">Tambah Kategori</span>
              </button>
            </div>,
            portalContainer ?? document.body
          )}
        </div>

        {/* Custom Date Trigger */}
        <div className="min-w-0">
          <Lab>{STR.date}</Lab>
          <DatePicker
            name="date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Note + Receipt */}
      <div className="mb-4 grid grid-cols-[1fr_auto] gap-3 items-end">
        <div className="flex-1">
          <Lab>{STR.note}</Lab>
          <Field className="h-11">
            <input
              name="note"
              type="text"
              placeholder={STR.notePlaceholder}
              defaultValue={defaults?.note ?? ""}
              className="flex-1 text-[13px] text-brand-text font-medium bg-transparent border-none outline-none font-sans"
            />
          </Field>
        </div>
        <div className="relative group">
          <Lab>Lampiran</Lab>
          <label className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-surface-2 border border-brand-hairline cursor-pointer hover:bg-brand-surface-solid transition-all active:scale-95">
            <input name="receipt" type="file" accept="image/*" className="sr-only" />
            {defaults?.receiptUrl ? (
              <img src={defaults.receiptUrl} alt="Receipt" className="w-8 h-8 object-cover rounded-lg" />
            ) : (
              <PaperclipIcon size={18} className="text-brand-text-dim group-hover:text-brand-text" />
            )}
          </label>
        </div>
      </div>

      {/* Recurring toggle (only for 'add' mode for now) */}
      {!isEdit && (
        <div className="mb-5 p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-hairline">
          <label className="flex items-center justify-between cursor-pointer mb-2">
            <span className="text-sm font-bold text-brand-text">Transaksi rutin?</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="isRecurring" 
                className="sr-only peer"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <div className="w-11 h-6 bg-brand-track peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
            </div>
          </label>
          
          {isRecurring && (
            <div className="mt-3.5 pt-3.5 border-t border-brand-hairline grid grid-cols-1 gap-3.5">
              <div>
                <Lab>Frekuensi</Lab>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { v: "daily", l: "Harian" },
                    { v: "weekly", l: "Mingguan" },
                    { v: "monthly", l: "Bulanan" },
                    { v: "yearly", l: "Tahunan" }
                  ].map(f => (
                    <label key={f.v} className="cursor-pointer">
                      <input type="radio" name="frequency" value={f.v} defaultChecked={f.v === "monthly"} className="sr-only peer" />
                      <div className="px-3.5 py-1.75 rounded-full text-[11.5px] font-bold text-brand-text-dim border border-brand-hairline transition-all peer-checked:bg-brand-accent-soft peer-checked:text-brand-accent peer-checked:border-brand-accent/30 whitespace-nowrap">
                        {f.l}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Hapus transaksi"
            className="px-3.5 py-3 rounded-2xl border border-brand-red/33 bg-brand-red-soft text-brand-red cursor-pointer font-semibold text-[13px] font-sans flex items-center gap-1.5 min-h-[44px]"
          >
            <TrashIcon size={14} />
            Hapus
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`flex-1 px-4.5 py-3.25 rounded-2xl border-none cursor-pointer font-bold text-sm tracking-wide font-sans flex items-center justify-center gap-2 transition-all min-h-[44px] bg-gradient-to-br from-brand-accent to-brand-violet ${
            submitting ? "wait opacity-70" : "opacity-100"
          } ${
            dark
              ? "text-[#06180F] shadow-[0_10px_28px_rgba(52,245,160,0.33),0_0_0_1px_rgba(52,245,160,0.4)_inset]"
              : "text-white shadow-[0_10px_24px_rgba(14,159,110,0.27)]"
          }`}
        >
          {isEdit ? <CheckIcon size={15} /> : <PlusIcon size={15} />}
          {submitting
            ? "Menyimpan…"
            : isEdit
              ? "Simpan perubahan"
              : STR.addTransactionBtn}
        </button>
      </div>
    </fetcher.Form>

    {showAddCat && createPortal(
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[overlayIn_0.2s_ease-out]" style={{ pointerEvents: "auto" }}>
        <div className="w-full max-w-[400px] bg-brand-surface-solid rounded-3xl border border-brand-hairline shadow-2xl p-6 animate-[sheetIn_0.3s_ease-out]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-brand-text">Kategori Baru</h3>
            <button type="button" onClick={() => setShowAddCat(false)} className="p-2 -mr-2 text-brand-text-mute hover:text-brand-text">
              <PlusIcon size={20} className="rotate-45" />
            </button>
          </div>
          
          <catFetcher.Form method="post" action="/action/category">
            <div className="space-y-5">
              <div>
                <Lab>Nama Kategori</Lab>
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="cth: Skin Care"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-brand-input border border-brand-hairline text-sm font-medium focus:border-brand-accent outline-none"
                />
              </div>
              
                <div>
                  <Lab>Ikon</Lab>
                  <div className="grid grid-cols-6 gap-2">
                    {CUSTOM_ICONS
                      .filter(i => !CATEGORY_OPTIONS.includes(i.key as any) && !customCategories.some(existing => existing.icon === i.key))
                      .map(i => (
                        <button
                          key={i.key}
                          type="button"
                          onClick={() => setNewCatIcon(i.key)}
                          className={`aspect-square rounded-xl grid place-items-center border-2 transition-all ${
                            newCatIcon === i.key ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-brand-hairline text-brand-text-dim hover:border-brand-text-mute'
                          }`}
                        >
                          <i.Icon size={18} />
                        </button>
                      ))
                    }
                    <input type="hidden" name="icon" value={newCatIcon} />
                  </div>
                </div>

                <div>
                  <Lab>Warna</Lab>
                  <div className="grid grid-cols-6 gap-2">
                    {CUSTOM_COLORS
                      .filter(c => {
                        const defaultColors = ["emerald", "violet", "blue", "rose"];
                        return !defaultColors.includes(c.key) && !customCategories.some(existing => existing.color === c.key);
                      })
                      .map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setNewCatColor(c.key)}
                          className={`aspect-square rounded-xl p-1 border-2 transition-all ${
                            newCatColor === c.key ? 'border-brand-accent' : 'border-transparent'
                          }`}
                        >
                          <div 
                            className="w-full h-full rounded-lg"
                            style={{ background: dark ? c.dark : c.light }}
                          />
                        </button>
                      ))
                    }
                    <input type="hidden" name="color" value={newCatColor} />
                  </div>
                </div>

              <button
                type="submit"
                disabled={catFetcher.state !== "idle" || !newCatName}
                className="w-full h-12 rounded-xl bg-brand-accent text-brand-bg font-bold shadow-lg shadow-brand-accent/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {catFetcher.state !== "idle" ? "Menyimpan..." : "Buat Kategori"}
              </button>
            </div>
          </catFetcher.Form>
        </div>
      </div>,
      portalContainer!
    )}
    </>
  );
}

function TypeToggle({
  defaultValue,
}: {
  defaultValue: "expense" | "income";
}) {
  return (
    <div className="flex gap-1 p-0.75 rounded-full bg-brand-surface-2 border border-brand-hairline text-[11px] font-bold">
      <label className="relative cursor-pointer">
        <input
          type="radio"
          name="type"
          value="expense"
          defaultChecked={defaultValue === "expense"}
          className="peer hidden"
        />
        <div className="px-2.5 py-1 rounded-full text-brand-text-dim transition-all peer-checked:bg-brand-red-soft peer-checked:text-brand-red">
          {STR.expense}
        </div>
      </label>
      <label className="relative cursor-pointer">
        <input
          type="radio"
          name="type"
          value="income"
          defaultChecked={defaultValue === "income"}
          className="peer hidden"
        />
        <div className="px-2.5 py-1 rounded-full text-brand-text-dim transition-all peer-checked:bg-brand-accent-soft peer-checked:text-brand-accent">
          {STR.incomeShort}
        </div>
      </label>
    </div>
  );
}

function Lab({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold mb-1.5">
      {children}
    </div>
  );
}

function Field({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 h-10.5 px-3 rounded-xl bg-brand-input border border-brand-hairline ${className}`}
    >
      {children}
    </div>
  );
}
