import { redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/action.transaction";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { transactions, recurringTransactions, accounts } from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

const schema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus lebih dari 0."),
  type: z.enum(["expense", "income"]),
  category: z.string().min(1, "Pilih kategori."),
  accountId: z.string().min(1, "Pilih akun/dompet."),
  note: z.string().max(200).optional(),
  date: z.string().min(1, "Tanggal harus diisi.").refine((v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 10, 0, 1);
    const maxDate = new Date(now.getFullYear() + 1, 11, 31);
    return d >= minDate && d <= maxDate;
  }, "Tanggal tidak valid atau di luar batas wajar."),
  isRecurring: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  
  // Handle Receipt Upload
  const receiptFile = form.get("receipt") as File | null;
  let receiptUrl: string | null = null;

  const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif", ".bmp", ".tif", ".tiff"]);
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

  if (receiptFile && receiptFile.size > 0) {
    const ext = path.extname(receiptFile.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return { error: "File struk harus berformat JPG, PNG, atau WebP." };
    }
    if (receiptFile.size > MAX_UPLOAD_BYTES) {
      return { error: "Ukuran file struk maksimal 10MB." };
    }
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      receiptUrl = `/uploads/receipts/${filename}`;
    } catch (err) {
      console.error("Upload error:", err);
      // Continue without receipt if upload fails
    }
  }

  const rawData = {
    amount: form.get("amount"),
    type: form.get("type") || "expense",
    category: form.get("category") || "food",
    accountId: form.get("accountId"),
    note: form.get("note") || undefined,
    date: form.get("date") || new Date().toISOString().slice(0, 10),
    isRecurring: form.get("isRecurring") || undefined,
    frequency: form.get("frequency") || undefined,
  };

  const parsed = schema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  
  try {
    const occurredAt = new Date(parsed.data.date);
    const { amount, type, accountId } = parsed.data;
    
    // 1. Create the primary transaction
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      amount,
      type,
      category: parsed.data.category,
      note: parsed.data.note?.trim() || null,
      receiptUrl,
      occurredAt,
    });

    // 2. Update Account Balance
    const balanceChange = type === "income" ? amount : -amount;
    await db
      .update(accounts)
      .set({ 
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));

    // 3. If recurring, create the schedule
    if (parsed.data.isRecurring === "on" && parsed.data.frequency) {
      const nextOccurrence = new Date(occurredAt);
      if (parsed.data.frequency === "daily") nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      else if (parsed.data.frequency === "weekly") nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      else if (parsed.data.frequency === "monthly") nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      else if (parsed.data.frequency === "yearly") nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);

      await db.insert(recurringTransactions).values({
        id: crypto.randomUUID(),
        userId,
        accountId,
        amount,
        type,
        category: parsed.data.category,
        note: parsed.data.note?.trim() || null,
        frequency: parsed.data.frequency,
        startDate: occurredAt,
        nextOccurrence,
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Database error:", err);
    return { error: "Gagal menyimpan transaksi ke database." };
  }
}

export function loader() {
  return redirect("/");
}
