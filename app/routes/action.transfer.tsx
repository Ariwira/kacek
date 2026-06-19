import { type ActionFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { transactions, accounts } from "~/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const fromAccountId = formData.get("fromAccountId") as string;
  const toAccountId = formData.get("toAccountId") as string;
  const amount = Number(formData.get("amount"));
  const note = (formData.get("note") as string) || "Transfer";

  if (!fromAccountId || !toAccountId) {
    return { error: "Dompet asal dan tujuan wajib dipilih" };
  }

  if (fromAccountId === toAccountId) {
    return { error: "Dompet asal dan tujuan tidak boleh sama" };
  }

  if (isNaN(amount) || amount <= 0) {
    return { error: "Nominal transfer harus lebih besar dari 0" };
  }

  // Get source account to check balance
  const [sourceAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, fromAccountId), eq(accounts.userId, userId)));

  if (!sourceAccount) {
    return { error: "Dompet asal tidak ditemukan" };
  }

  if (sourceAccount.balance < amount) {
    return { error: `Saldo tidak mencukupi. Saldo saat ini: Rp ${new Intl.NumberFormat("id-ID").format(sourceAccount.balance)}` };
  }

  const [destAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, toAccountId), eq(accounts.userId, userId)));

  if (!destAccount) {
    return { error: "Dompet tujuan tidak ditemukan" };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Subtract from source
      await tx
        .update(accounts)
        .set({ balance: sourceAccount.balance - amount })
        .where(eq(accounts.id, fromAccountId));

      // 2. Add to destination
      await tx
        .update(accounts)
        .set({ balance: destAccount.balance + amount })
        .where(eq(accounts.id, toAccountId));

      // 3. Create transfer transaction record
      await tx.insert(transactions).values({
        id: `tx_${nanoid(10)}`,
        userId,
        accountId: fromAccountId,
        transferToAccountId: toAccountId,
        amount,
        type: "transfer",
        category: "transfer",
        note,
        occurredAt: new Date(),
      });
    });

    return { success: "Transfer saldo berhasil dilakukan" };
  } catch (error) {
    console.error("Transfer Error:", error);
    return { error: "Terjadi kesalahan saat memproses transfer" };
  }
}
