import { redirect } from "react-router";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { Route } from "./+types/action.goal.contribute";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { goals, accounts, transactions } from "~/db/schema";
import crypto from "crypto";

const schema = z.object({
  amount: z.coerce.number().int().positive("Nominal harus lebih dari 0."),
  accountId: z.string().min(1, "Pilih dompet sumber dana."),
});

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  const form = await request.formData();
  const parsed = schema.safeParse({ amount: form.get("amount"), accountId: form.get("accountId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  
  const amount = parsed.data.amount;
  const accountId = parsed.data.accountId;

  const [goal] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  if (!goal) return { error: "Tujuan tidak ditemukan." };

  const [account] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!account) return { error: "Dompet tidak ditemukan." };

  // Use a transaction if possible, or just sequential queries since it's SQLite
  await db.transaction(async (tx) => {
    // 1. Update goal amount
    await tx
      .update(goals)
      .set({
        currentAmount: sql`${goals.currentAmount} + ${amount}`,
      })
      .where(eq(goals.id, id));

    // 2. Deduct from account balance
    await tx
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} - ${amount}`,
      })
      .where(eq(accounts.id, accountId));

    // 3. Record transaction
    await tx.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      goalId: id,
      amount,
      type: "expense",
      category: "other", // Or a specific category for saving
      note: `Nabung untuk ${goal.name}`,
      occurredAt: new Date(),
    });
  });

  return { success: true };
}

export function loader() {
  return redirect("/tujuan");
}
