import { redirect } from "react-router";
import { and, eq, sql } from "drizzle-orm";
import type { Route } from "./+types/action.transaction.delete";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { transactions, accounts } from "~/db/schema";

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  
  // 1. Get transaction to know amount and account
  const [tx] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  if (!tx) return { error: "Transaksi tidak ditemukan." };

  // 2. Reverse balance change (including when accountId is null — skip gracefully)
  if (tx.type === "transfer") {
    if (tx.accountId) {
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${tx.amount}`
        })
        .where(and(eq(accounts.userId, userId), eq(accounts.id, tx.accountId)));
    }
    if (tx.transferToAccountId) {
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} - ${tx.amount}`
        })
        .where(and(eq(accounts.userId, userId), eq(accounts.id, tx.transferToAccountId)));
    }
  } else if (tx.accountId) {
    const balanceChange = tx.type === "income" ? -tx.amount : tx.amount;
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, tx.accountId)));
  }

  // 3. Delete transaction
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  return { success: true };
}

export function loader() {
  return redirect("/transaksi");
}
