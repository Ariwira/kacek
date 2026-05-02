import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronIcon } from "~/components/icons";
import { formatDate } from "~/lib/format";
import { usePortalContainer } from "~/components/bottom-sheet";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

/** Compute dropdown position relative to viewport */
function calcPosition(triggerEl: HTMLElement) {
  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const dropdownH = 340;
  const openUp = spaceBelow < dropdownH;

  return {
    top: openUp ? undefined : rect.bottom + 6,
    bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
    left: rect.left,
    width: rect.width,
    openUp,
  };
}

export function DatePicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalContainer = usePortalContainer();
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 260 });

  // Parse current value
  const selected = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  // Recompute position when open or on scroll/resize
  const updatePos = useCallback(() => {
    if (!triggerRef.current || !open) return;
    setPos(calcPosition(triggerRef.current));
  }, [open]);

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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // When value changes externally, sync view
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const isToday = (day: number) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    day === today.getDate();

  const isSelected = (day: number) => {
    if (!value) return false;
    const s = new Date(value + "T00:00:00");
    return (
      viewYear === s.getFullYear() &&
      viewMonth === s.getMonth() &&
      day === s.getDate()
    );
  };

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      setPos(calcPosition(triggerRef.current));
    }
    setOpen(!open);
  };

  // Determine portal target: use context container if available, else document.body
  // Only evaluated client-side since `open` is always false during SSR
  const portalTarget = portalContainer ?? (typeof document !== "undefined" ? document.body : null);

  const calendarDropdown = (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] rounded-xl bg-brand-surface-solid border border-brand-hairline shadow-2xl animate-[overlayIn_0.15s_ease-out] backdrop-blur-xl overflow-hidden"
      style={{
        pointerEvents: "auto",
        top: pos.top != null ? `${pos.top}px` : undefined,
        bottom: pos.bottom != null ? `${pos.bottom}px` : undefined,
        left: `${pos.left}px`,
        width: `${pos.width}px`,
        minWidth: 260,
      }}
    >
      {/* Header: Month/Year + arrows */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-sm font-bold text-brand-text">
          {MONTH_NAMES_ID[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg grid place-items-center text-brand-text-mute hover:bg-brand-surface-2 hover:text-brand-text transition-colors cursor-pointer"
          >
            <ChevronIcon size={12} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg grid place-items-center text-brand-text-mute hover:bg-brand-surface-2 hover:text-brand-text transition-colors cursor-pointer"
          >
            <ChevronIcon size={12} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 px-2">
        {DAY_LABELS.map((dl) => (
          <div
            key={dl}
            className="text-center text-[10px] font-bold text-brand-text-mute uppercase tracking-wider py-1.5"
          >
            {dl}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 px-2 pb-2">
        {cells.map((day, i) => (
          <div key={i} className="flex justify-center py-0.5">
            {day ? (
              <button
                type="button"
                onClick={() => selectDay(day)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-all grid place-items-center
                  ${
                    isSelected(day)
                      ? "bg-brand-accent text-[#06180F] shadow-[0_4px_12px_rgba(52,245,160,0.3)]"
                      : isToday(day)
                        ? "bg-brand-accent-soft text-brand-accent ring-1 ring-brand-accent/30"
                        : "text-brand-text hover:bg-brand-surface-2"
                  }
                `}
              >
                {day}
              </button>
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        ))}
      </div>

      {/* Footer: Today shortcut */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-brand-hairline">
        <button
          type="button"
          onClick={() => {
            onChange(todayISO);
            setViewYear(today.getFullYear());
            setViewMonth(today.getMonth());
          }}
          className="text-[11px] font-bold text-brand-text-mute hover:text-brand-accent cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-brand-accent-soft"
        >
          Hari ini
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayISO);
            setOpen(false);
          }}
          className="text-[11px] font-bold text-brand-accent cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-brand-accent-soft"
        >
          Pilih hari ini
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-w-0 relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-3 h-12 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-left cursor-pointer transition-all active:scale-[0.98]"
      >
        <div className="w-6 h-6 shrink-0 grid place-items-center text-brand-text-mute">
          <CalendarIcon size={15} />
        </div>
        <span className={`flex-1 text-sm font-semibold truncate ${value ? "text-brand-text" : "text-brand-text-mute"}`}>
          {value ? formatDate(value) : "Pilih tanggal"}
        </span>
        <ChevronIcon
          size={14}
          className={`text-brand-text-mute shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Calendar dropdown — rendered via portal to avoid overflow clipping */}
      {open && portalTarget && createPortal(calendarDropdown, portalTarget)}
    </div>
  );
}
