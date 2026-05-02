import { redirect } from "react-router";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.goal.delete";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { goals } from "~/db/schema";

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return redirect("/tujuan");
}

export function loader() {
  return redirect("/tujuan");
}
