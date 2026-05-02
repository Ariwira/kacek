import { redirect } from "react-router";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.budget";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { budgets, CATEGORY_ENUM } from "~/db/schema";
import { formatYYYYMM } from "~/lib/queries.server";

const schema = z.object({
  category: z.string().min(1, "Pilih kategori.").refine((v) => v !== "income", {
    message: "Kategori income tidak punya anggaran.",
  }),
  amount: z.coerce.number().int().min(0),
  month: z.string().optional(),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const parsed = schema.safeParse({
    category: form.get("category"),
    amount: form.get("amount"),
    month: form.get("month") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const month = parsed.data.month ?? formatYYYYMM();
  const existing = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.category, parsed.data.category),
        eq(budgets.month, month),
      ),
    );
  if (existing[0]) {
    await db
      .update(budgets)
      .set({ amount: parsed.data.amount, updatedAt: new Date() })
      .where(eq(budgets.id, existing[0].id));
  } else {
    await db.insert(budgets).values({
      id: crypto.randomUUID(),
      userId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      month,
    });
  }
  return redirect("/anggaran");
}

export function loader() {
  return redirect("/anggaran");
}
