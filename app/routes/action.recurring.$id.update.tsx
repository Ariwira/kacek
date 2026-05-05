import { redirect } from "react-router";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.recurring.$id.update";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { recurringTransactions, CATEGORY_ENUM } from "~/db/schema";

const schema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus lebih dari 0."),
  type: z.enum(["expense", "income"]),
  category: z.string().min(1, "Pilih kategori."),
  accountId: z.string().min(1, "Pilih akun/dompet."),
  note: z.string().max(200).optional(),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const { amount, type, accountId, category, note } = parsed.data;

  await db
    .update(recurringTransactions)
    .set({
      amount,
      type,
      category,
      accountId,
      note: note?.trim() || null,
    })
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));

  const referer = request.headers.get("Referer") ?? "/transaksi";
  const safePath = (() => { try { const u = new URL(referer); return u.pathname + u.search; } catch { return referer.startsWith("/") ? referer : "/transaksi"; } })();
  return redirect(safePath);
}

export function loader() {
  return redirect("/transaksi");
}
