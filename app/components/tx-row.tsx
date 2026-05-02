import { CatIcon, PaperclipIcon } from "./icons";
import { type CategoryKey, type ThemeTokens, type Theme, getCatColor } from "./theme";
import { STR } from "~/lib/i18n";
import { formatIDR, formatRelativeDay } from "~/lib/format";

export type Transaction = {
  id: string | number;
  note: string;
  cat: CategoryKey;
  catName?: string;
  catIcon?: string;
  catColor?: string;
  date: Date | string;
  amount: number;
  type: "expense" | "income";
  receiptUrl?: string | null;
  accountId?: string | null;
};

export function TxRow({
  tx,
  last,
  onClick,
  theme = "dark",
}: {
  tx: Transaction;
  T?: ThemeTokens;
  last?: boolean;
  onClick?: () => void;
  theme?: Theme;
}) {
  const isIncome = tx.type === "income";
  const dateLabel =
    typeof tx.date === "string" && (tx.date === "Hari ini" || tx.date === "Kemarin" || /^[A-Z]/.test(tx.date))
      ? tx.date
      : formatRelativeDay(tx.date);
  
  const cColor = getCatColor(tx.catColor || tx.cat, theme);

  const content = (
    <>
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
        <div className="text-sm font-semibold text-brand-text whitespace-nowrap overflow-hidden text-ellipsis">
          {tx.note || tx.catName || STR.cat[tx.cat]}
        </div>
        <div className="flex gap-2 mt-0.75 items-center">
          <span className="text-xs text-brand-text-mute">{dateLabel}</span>
          <span className="w-0.75 h-0.75 rounded-full bg-brand-text-mute" />
          <span className="text-xs text-brand-text-mute">
            {tx.catName || STR.cat[tx.cat]}
          </span>
          {tx.receiptUrl && (
            <>
              <span className="w-0.75 h-0.75 rounded-full bg-brand-text-mute" />
              <PaperclipIcon size={12} className="text-brand-text-dim" />
            </>
          )}
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
    </>
  );

  const className = `grid grid-cols-[40px_1fr_auto] gap-3.5 items-center py-3.25 px-1 w-full border-none bg-transparent text-left cursor-pointer font-sans transition-colors hover:bg-brand-surface-2/50 rounded-xl ${
    last ? "" : "border-b border-brand-hairline"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
