import type { Route } from "./+types/action.export";
import { requireUserId } from "~/lib/auth.server";
import { listTransactions, listAccounts } from "~/lib/queries.server";
import { STR } from "~/lib/i18n";
import ExcelJS from "exceljs";

// Brand colors
const CLR = {
  headerBg: "FF1A1A2E",       // dark navy (header)
  headerFg: "FFFFFFFF",       // white text
  expenseBg: "FFFFF0F0",      // light red row
  incomeBg:  "FFF0FFF4",      // light green row
  expenseAmt: "FFC0392B",     // red amount
  incomeAmt:  "FF27AE60",     // green amount
  summaryBg:  "FFF5F5F5",     // light grey summary rows
  totalBg:    "FFECE9FF",     // light purple total row
  totalFg:    "FF5B21B6",     // purple total text
  border:     "FFDDDDDD",
} as const;

function applyBorder(cell: ExcelJS.Cell) {
  const side: ExcelJS.BorderStyle = "thin";
  cell.border = {
    top:    { style: side, color: { argb: CLR.border } },
    left:   { style: side, color: { argb: CLR.border } },
    bottom: { style: side, color: { argb: CLR.border } },
    right:  { style: side, color: { argb: CLR.border } },
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const [txList, acctList] = await Promise.all([
    listTransactions(userId, { type: "all", category: "all" }),
    listAccounts(userId),
  ]);

  const acctMap = new Map(acctList.map((a) => [a.id, a.name]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "KaCek";
  wb.created = new Date();

  // ── Sheet 1: Transaksi ──────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Transaksi", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultColWidth: 14 },
  });

  // Column definitions
  ws.columns = [
    { key: "no",     header: "No",        width: 5  },
    { key: "date",   header: "Tanggal",   width: 14 },
    { key: "day",    header: "Hari",      width: 11 },
    { key: "acct",   header: "Akun",      width: 18 },
    { key: "cat",    header: "Kategori",  width: 18 },
    { key: "note",   header: "Catatan",   width: 32 },
    { key: "type",   header: "Tipe",      width: 13 },
    { key: "amount", header: "Jumlah (Rp)", width: 18 },
  ];

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.headerBg } };
    cell.font   = { bold: true, color: { argb: CLR.headerFg }, size: 10, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    applyBorder(cell);
  });
  headerRow.height = 22;

  // Auto-filter on header
  ws.autoFilter = { from: "A1", to: "H1" };

  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  txList.forEach((tx, i) => {
    const isExpense = tx.type === "expense";
    const d = new Date(tx.date);
    const rowBg  = isExpense ? CLR.expenseBg : CLR.incomeBg;
    const amtClr = isExpense ? CLR.expenseAmt : CLR.incomeAmt;
    const catLabel = tx.catName || STR.cat[tx.cat as keyof typeof STR.cat] || tx.cat;

    const row = ws.addRow({
      no:     i + 1,
      date:   d,
      day:    DAYS[d.getDay()],
      acct:   acctMap.get(tx.accountId ?? "") ?? "-",
      cat:    catLabel,
      note:   tx.note || "-",
      type:   isExpense ? "Pengeluaran" : "Pemasukan",
      amount: isExpense ? -tx.amount : tx.amount,
    });

    row.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.font = { size: 10, name: "Calibri" };
      cell.alignment = { vertical: "middle" };
      applyBorder(cell);

      if (col === 1) { // No
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (col === 2) { // Tanggal
        cell.numFmt = "DD/MM/YYYY";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (col === 3) { // Hari
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if (col === 7) { // Tipe
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = {
          size: 10, name: "Calibri", bold: true,
          color: { argb: amtClr },
        };
      }
      if (col === 8) { // Jumlah
        cell.numFmt = '#,##0;[Red]-#,##0';
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font = { size: 10, name: "Calibri", bold: true, color: { argb: amtClr } };
      }
    });

    row.height = 18;
  });

  // Totals row
  if (txList.length > 0) {
    const lastDataRow = txList.length + 1;
    const totalRow = ws.addRow({
      no: "",
      date: "",
      day: "",
      acct: "",
      cat: "",
      note: "TOTAL",
      type: "",
      amount: { formula: `SUMIF(G2:G${lastDataRow},"Pemasukan",H2:H${lastDataRow})+SUMIF(G2:G${lastDataRow},"Pengeluaran",H2:H${lastDataRow})` },
    });
    totalRow.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.totalBg } };
      cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: CLR.totalFg } };
      cell.alignment = { vertical: "middle" };
      applyBorder(cell);
      if (col === 6) cell.alignment = { horizontal: "right", vertical: "middle" };
      if (col === 8) {
        cell.numFmt = '#,##0;[Red]-#,##0';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
    totalRow.height = 20;
  }

  // ── Sheet 2: Ringkasan ──────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Ringkasan");
  ws2.columns = [
    { key: "label",  width: 26 },
    { key: "value",  width: 20 },
  ];

  const addSection = (title: string) => {
    const r = ws2.addRow([title, ""]);
    ws2.mergeCells(`A${r.number}:B${r.number}`);
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.headerBg } };
    r.getCell(1).font = { bold: true, color: { argb: CLR.headerFg }, size: 11, name: "Calibri" };
    r.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    r.height = 22;
  };

  const addKV = (label: string, value: number | string, isCurrency = false, bgArgb?: string) => {
    const r = ws2.addRow([label, value]);
    r.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb ?? CLR.summaryBg } };
      cell.font = { size: 10, name: "Calibri" };
      applyBorder(cell);
      if (col === 1) cell.alignment = { indent: 1, vertical: "middle" };
      if (col === 2) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (isCurrency) cell.numFmt = '"Rp "#,##0;[Red]"Rp "-#,##0';
      }
    });
    r.height = 18;
  };

  const totalIncome  = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  ws2.addRow([]); // spacer
  addSection("📊 Ringkasan Keseluruhan");
  addKV("Total Pemasukan",  totalIncome,   true, CLR.incomeBg);
  addKV("Total Pengeluaran", totalExpense, true, CLR.expenseBg);
  addKV("Selisih (Net)", net, true, CLR.totalBg);
  addKV("Jumlah Transaksi", txList.length, false);

  ws2.addRow([]); // spacer

  // Breakdown by category (expense only)
  const catTotals = new Map<string, number>();
  txList
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const label = t.catName || STR.cat[t.cat as keyof typeof STR.cat] || t.cat;
      catTotals.set(label, (catTotals.get(label) ?? 0) + t.amount);
    });
  const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedCats.length > 0) {
    addSection("🗂 Pengeluaran per Kategori");
    for (const [label, amt] of sortedCats) {
      addKV(label, amt, true);
    }
  }

  ws2.addRow([]); // spacer

  // Breakdown by month
  const monthTotals = new Map<string, { income: number; expense: number }>();
  txList.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthTotals.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += t.amount;
    else cur.expense += t.amount;
    monthTotals.set(key, cur);
  });
  const sortedMonths = [...monthTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedMonths.length > 0) {
    addSection("📅 Ringkasan per Bulan");
    const hdr = ws2.addRow(["Bulan", "Pemasukan", "Pengeluaran", "Net"]);
    ws2.mergeCells(`C${hdr.number}:D${hdr.number}`); // just lay cols out
    // actually use 4 cols for this section — resize
    ws2.getColumn(3).width = 16;
    ws2.getColumn(4).width = 16;
    hdr.eachCell((cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E4FF" } };
      cell.font   = { bold: true, size: 10, name: "Calibri", color: { argb: CLR.totalFg } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(cell);
    });
    hdr.height = 18;

    for (const [month, { income, expense }] of sortedMonths) {
      const [yr, mo] = month.split("-");
      const label = `${new Date(Number(yr), Number(mo) - 1).toLocaleString("id-ID", { month: "long" })} ${yr}`;
      const r = ws2.addRow([label, income, expense, income - expense]);
      r.eachCell((cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.summaryBg } };
        cell.font = { size: 10, name: "Calibri" };
        applyBorder(cell);
        cell.alignment = { vertical: "middle" };
        if (col === 1) cell.alignment = { indent: 1, vertical: "middle" };
        if (col >= 2) {
          cell.numFmt = '"Rp "#,##0;[Red]"Rp "-#,##0';
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
      });
      r.height = 18;
    }
  }

  // ── Serialize ───────────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();

  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transaksi-kacek-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
