import { redirect } from "react-router";
import type { Route } from "./+types/action.logout";
import { logout } from "~/lib/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export function loader() {
  return redirect("/");
}
