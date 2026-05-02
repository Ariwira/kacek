import { Outlet, redirect, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/_auth";
import { type Theme } from "~/components/theme";
import { GlassCard } from "~/components/glass-card";
import { ThemeToggle } from "~/components/theme-toggle";
import { getUserId } from "~/lib/auth.server";
import { STR } from "~/lib/i18n";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (userId) throw redirect("/");
  return null;
}

export default function AuthLayout() {
  const root = useRouteLoaderData("root") as { theme: Theme } | undefined;
  const theme: Theme = root?.theme ?? "dark";

  return (
    <div className="kc-bg-gradient min-h-screen text-brand-text flex items-center justify-center p-6 relative overflow-hidden font-sans">
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
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle theme={theme} />
      </div>
      <div className="relative w-full max-w-[440px]">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-[30px] font-bold tracking-tight text-brand-text">
            {STR.brand}
            <span className="text-brand-accent">.</span>
          </div>
        </div>

        <GlassCard className="p-8 md:p-10">
          <Outlet context={{ theme }} />
        </GlassCard>
      </div>
    </div>
  );
}
