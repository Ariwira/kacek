import { redirect } from "react-router";
import { and, eq, sql } from "drizzle-orm";
import type { Route } from "./+types/action.goal.complete";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { goals, accounts, transactions } from "~/db/schema";
import crypto from "crypto";

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const id = params.id!;
  const form = await request.formData();
  const intent = form.get("intent"); // "complete" or "withdraw"
  const refundAccountId = form.get("refundAccountId") as string | null;

  const [goal] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  
  if (!goal) return redirect("/tujuan");

  await db.transaction(async (tx) => {
    if (intent === "complete") {
        // Mark as completed. The money is spent (already deducted during contribution).
        await tx.update(goals)
          .set({ isCompleted: true })
          .where(eq(goals.id, id));
    } else if (intent === "withdraw" && refundAccountId) {
        // Withdraw the funds back to an account
        const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, refundAccountId), eq(accounts.userId, userId)));
        
        if (account) {
            // 1. Credit the account
            await tx.update(accounts)
              .set({ balance: sql`${accounts.balance} + ${goal.currentAmount}` })
              .where(eq(accounts.id, refundAccountId));

            // 2. Record the income transaction
            await tx.insert(transactions).values({
              id: crypto.randomUUID(),
              userId,
              accountId: refundAccountId,
              amount: goal.currentAmount,
              type: "income",
              category: "other",
              note: `Penarikan dana dari tujuan: ${goal.name}`,
              occurredAt: new Date(),
            });
            
            // 3. Set currentAmount to 0 and mark as completed (or deleted depending on preference, let's keep it but zeroed out and completed/withdrawn)
            // It might be cleaner to just delete it, or set isCompleted = true, currentAmount = 0.
            await tx.update(goals)
              .set({ isCompleted: true, currentAmount: 0 })
              .where(eq(goals.id, id));
        }
    }
  });

  return redirect("/tujuan");
}

export function loader() {
  return redirect("/tujuan");
}