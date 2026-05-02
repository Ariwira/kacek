import type { Route } from "./+types/action.export";
import { requireUserId } from "~/lib/auth.server";
import { listTransactions } from "~/lib/queries.server";
import { STR } from "~/lib/i18n";
import * as XLSX from "xlsx";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const transactions = await listTransactions(userId, { type: "all", category: "all" });

  const headers = ["Tanggal", "Kategori", "Catatan", "Tipe", "Jumlah"];
  const rows = transactions.map((tx) => [
    new Date(tx.date).toLocaleDateString("id-ID"),
    STR.cat[tx.cat as keyof typeof STR.cat] || tx.cat,
    tx.note || "-",
    tx.type === "expense" ? "Pengeluaran" : "Pemasukan",
    tx.amount,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transaksi-kacek-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
