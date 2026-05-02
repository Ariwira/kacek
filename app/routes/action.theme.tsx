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
  return redirect(referer, { headers });
}

export function loader() {
  return redirect("/");
}
