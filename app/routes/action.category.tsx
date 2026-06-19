import { type ActionFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { categories, transactions, budgets, recurringTransactions } from "~/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  
  const intent = (formData.get("intent") as string) || "create";

  if (intent === "create") {
    const name = formData.get("name") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;

    if (!name || !icon || !color) {
      return { error: "Semua field harus diisi" };
    }

    await db.insert(categories).values({
      id: `cat_${nanoid(10)}`,
      userId,
      name,
      icon,
      color,
    });

    return { success: true };
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;

    if (!id || !name || !icon || !color) {
      return { error: "Semua field harus diisi" };
    }

    await db.update(categories)
      .set({ name, icon, color })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    return { success: true };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    if (!id) {
      return { error: "ID kategori wajib diisi" };
    }

    // Run updates & delete in a transaction to keep integrity
    await db.transaction(async (tx) => {
      // 1. Reassign transactions to "other"
      await tx.update(transactions)
        .set({ category: "other" })
        .where(and(eq(transactions.userId, userId), eq(transactions.category, id)));

      // 2. Delete related budgets
      await tx.delete(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.category, id)));

      // 3. Reassign recurring transactions to "other"
      await tx.update(recurringTransactions)
        .set({ category: "other" })
        .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.category, id)));

      // 4. Delete the category
      await tx.delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    });

    return { success: true };
  }

  return { error: "Intent tidak dikenal" };
}
