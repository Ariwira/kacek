import { redirect } from "react-router";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { Route } from "./+types/action.goal.contribute";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { goals } from "~/db/schema";

const schema = z.object({
  amount: z.coerce.number().int().positive("Nominal harus lebih dari 0."),
});

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  const form = await request.formData();
  const parsed = schema.safeParse({ amount: form.get("amount") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  await db
    .update(goals)
    .set({
      currentAmount: sql`${goals.currentAmount} + ${parsed.data.amount}`,
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return redirect("/tujuan");
}

export function loader() {
  return redirect("/tujuan");
}
