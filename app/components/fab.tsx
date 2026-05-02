import { PlusIcon } from "./icons";

export function FAB({
  onClick,
  ariaLabel = "Tambah transaksi",
  dark = false,
}: {
  onClick: () => void;
  ariaLabel?: string;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed right-4.5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 lg:hidden w-14 h-14 rounded-full border-none grid place-items-center cursor-pointer transition-transform active:scale-95 bg-gradient-to-br from-brand-accent to-brand-violet text-white shadow-[0_14px_32px_rgba(52,245,160,0.4),0_0_0_1px_rgba(52,245,160,0.33)_inset]"
    >
      <PlusIcon size={22} />
    </button>
  );
}
