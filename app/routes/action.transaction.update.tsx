import { redirect } from "react-router";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { Route } from "./+types/action.transaction.update";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { transactions, accounts, CATEGORY_ENUM } from "~/db/schema";

const schema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus lebih dari 0."),
  type: z.enum(["expense", "income"]),
  category: z.string().min(1, "Pilih kategori."),
  accountId: z.string().min(1, "Pilih akun/dompet."),
  note: z.string().max(200).optional(),
  date: z.string().min(1),
});

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  const form = await request.formData();
  
  const parsed = schema.safeParse({
    amount: form.get("amount"),
    type: form.get("type") || "expense",
    category: form.get("category"),
    accountId: form.get("accountId"),
    note: form.get("note") || undefined,
    date: form.get("date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  // 1. Get old transaction state
  const [oldTx] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!oldTx) return { error: "Transaksi tidak ditemukan." };

  const { amount, type, accountId, category, note, date } = parsed.data;

  // 2. Adjust balances
  // Reverse old change
  if (oldTx.accountId) {
    const oldReverse = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${oldReverse}` })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, oldTx.accountId)));
  }

  // Apply new change
  const newApply = type === "income" ? amount : -amount;
  await db
    .update(accounts)
    .set({ balance: sql`${accounts.balance} + ${newApply}` })
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));

  // 3. Update transaction record
  await db
    .update(transactions)
    .set({
      amount,
      type,
      category,
      accountId,
      note: note?.trim() || null,
      occurredAt: new Date(date),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  return { success: true };
}

export function loader() {
  return redirect("/transaksi");
}
