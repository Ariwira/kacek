import { Form, NavLink, useRouteLoaderData, useNavigation, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { BellIcon, LogoutIcon, SearchIcon } from "~/components/icons";
import { ThemeToggle } from "~/components/theme-toggle";
import { STR } from "~/lib/i18n";
import { monthNameID } from "~/lib/format";
import type { Theme, ThemeTokens } from "~/components/theme";

type NavItemDef = { label: string; to: string; end?: boolean };

const NAV_ITEMS: NavItemDef[] = [
  { label: STR.nav[0], to: "/", end: true },
  { label: STR.nav[1], to: "/transaksi" },
  { label: STR.nav[2], to: "/anggaran" },
  { label: STR.nav[3], to: "/tujuan" },
];

export function Header({
  T,
  theme,
  userInitials = "KC",
}: {
  T: ThemeTokens;
  theme: Theme;
  userInitials?: string;
}) {
  const appData = useRouteLoaderData("routes/_app") as { notifications: any[] } | undefined;
  const unreadCount = appData?.notifications?.filter(n => !n.isRead).length ?? 0;
  
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching = navigation.location?.pathname === "/transaksi" && 
                     new URLSearchParams(navigation.location.search).has("q");

  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  // Sync internal state with URL params
  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const month = monthNameID();
  const year = new Date().getFullYear();

  return (
    <header className="flex items-center justify-between mb-4.5 lg:mb-6 gap-3">
      {/* Brand block */}
      <div className="flex items-center gap-3 min-w-0 shrink">
        <NavLink to="/" className="text-xl font-bold tracking-tight text-brand-text leading-none no-underline">
          {STR.brand}<span className="text-brand-accent">.</span>
        </NavLink>

        {/* Top nav — desktop only */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 p-1 rounded-full bg-brand-surface-2 border border-brand-hairline self-center">
          {NAV_ITEMS.map(({ label, to, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3.5 py-1.75 rounded-full text-[12.5px] font-semibold no-underline whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-brand-surface-solid text-brand-text shadow-[0_0_0_1px_rgba(255,255,255,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] light:shadow-[0_4px_12px_rgba(20,30,60,0.08)]"
                    : "text-brand-text-dim hover:text-brand-text"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — only desktop */}
        <Form
          method="get"
          action="/transaksi"
          className={`hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-surface-2 border border-brand-hairline text-brand-text-dim text-[12.5px] min-w-[220px] h-[38px] transition-all ${isSearching ? "opacity-60 ring-1 ring-brand-accent/30" : ""}`}
        >
          <div className={isSearching ? "animate-pulse text-brand-accent" : ""}>
            <SearchIcon size={14} />
          </div>
          <input
            name="q"
            type="text"
            placeholder={STR.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="bg-transparent border-none outline-none text-brand-text text-[12.5px] w-full"
          />
        </Form>

        <ThemeToggle theme={theme} T={T} />

        {/* Bell — desktop only */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-notifications"))}
          className="hidden lg:grid place-items-center w-[38px] h-[38px] rounded-xl bg-brand-surface-2 border border-brand-hairline text-brand-text-dim cursor-pointer relative p-0 min-h-[44px] min-w-[44px]"
          aria-label="Notifikasi"
        >
          <BellIcon size={15} />
          {unreadCount > 0 && (
            <span className="absolute top-[9px] right-[10px] w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_var(--accent)]" />
          )}
        </button>

        {/* Avatar — Desktop & Mobile */}
        <NavLink
          to="/profil"
          className={({ isActive }) =>
            `grid place-items-center w-[38px] h-[38px] rounded-full bg-gradient-to-br from-brand-violet to-brand-accent font-bold text-[13px] text-brand-bg shrink-0 no-underline transition-transform active:scale-95 ${
              isActive ? "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg" : ""
            }`
          }
          title="Profil saya"
        >
          {userInitials}
        </NavLink>

        <Form method="post" action="/action/logout" className="hidden sm:flex">
          <button
            type="submit"
            title={STR.logout}
            aria-label={STR.logout}
            className="grid place-items-center w-[38px] h-[38px] rounded-xl bg-brand-surface-2 border border-brand-hairline text-brand-text-dim cursor-pointer p-0 min-h-[44px] min-w-[44px]"
          >
            <LogoutIcon size={15} />
          </button>
        </Form>
      </div>
    </header>
  );
}
