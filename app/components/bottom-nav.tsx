import type { ReactElement } from "react";
import { NavLink } from "react-router";
import { HomeIcon, ListIcon, WalletIcon, TargetIcon, ChartIcon } from "./icons-extra";

type NavItem = {
  to: string;
  label: string;
  Icon: (p: { size?: number }) => ReactElement;
  end?: boolean;
};

export function BottomNav() {
  const items: NavItem[] = [
    { to: "/", label: "Ringkasan", Icon: HomeIcon, end: true },
    { to: "/transaksi", label: "Transaksi", Icon: ListIcon },
    { to: "/laporan", label: "Laporan", Icon: ChartIcon },
    { to: "/anggaran", label: "Anggaran", Icon: WalletIcon },
    { to: "/tujuan", label: "Tujuan", Icon: TargetIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex justify-around items-center px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 bg-brand-bg/85 backdrop-blur-xl saturate-140 border-t border-brand-hairline">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `tour-nav-${to.replace("/", "") || "home"} flex-1 flex flex-col items-center justify-center gap-0.75 min-h-[56px] px-1 py-1.5 no-underline rounded-xl transition-all min-w-[44px] min-h-[44px] ${
              isActive ? "text-brand-accent bg-brand-accent-soft" : "text-brand-text-dim hover:text-brand-text"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} />
              <span className={`text-[10.5px] tracking-tight ${isActive ? "font-bold" : "font-semibold"}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
