import { redirect } from "react-router";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.notification.read";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { notifications } from "~/db/schema";

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const id = form.get("id") as string;

  if (!id) return { error: "ID not found" };

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

  const referer = request.headers.get("Referer") ?? "/";
  return redirect(referer);
}

export function loader() {
  return redirect("/");
}
