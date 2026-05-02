import { redirect } from "react-router";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.recurring.$id.delete";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { recurringTransactions } from "~/db/schema";

export async function action({ params, request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const { id } = params;

  await db
    .delete(recurringTransactions)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));

  return redirect("/transaksi");
}
