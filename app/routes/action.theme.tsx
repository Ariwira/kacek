import { redirect } from "react-router";
import type { Route } from "./+types/action.theme";
import { setThemeHeader } from "~/lib/theme.server";
import type { Theme } from "~/components/theme";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const raw = form.get("theme");
  const theme: Theme = raw === "light" ? "light" : "dark";
  const headers = await setThemeHeader(theme);
  const referer = request.headers.get("Referer") ?? "/";
  const safePath = (() => { try { const u = new URL(referer); return u.pathname + u.search; } catch { return referer.startsWith("/") ? referer : "/"; } })();
  return redirect(safePath, { headers });
}

export function loader() {
  return redirect("/");
}
