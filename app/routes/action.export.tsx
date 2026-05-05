import type { Route } from "./+types/action.export";
import { requireUserId } from "~/lib/auth.server";
import { listTransactions, listAccounts } from "~/lib/queries.server";
import { STR } from "~/lib/i18n";
import XLSX from "xlsx-js-style";

// ── Style helpers ────────────────────────────────────────────────────────────

const font = (opts: { bold?: boolean; color?: string; sz?: number } = {}) => ({
  name: "Calibri",
  sz: opts.sz ?? 10,
  bold: opts.bold ?? false,
  color: { rgb: opts.color ?? "000000" },
});

const fill = (rgb: string) => ({ type: "pattern", patternType: "solid", fgColor: { rgb } });

const border = () => ({
  top:    { style: "thin", color: { rgb: "DDDDDD" } },
  bottom: { style: "thin", color: { rgb: "DDDDDD" } },
  left:   { style: "thin", color: { rgb: "DDDDDD" } },
  right:  { style: "thin", color: { rgb: "DDDDDD" } },
});

const align = (h: string = "left", v: string = "center") => ({
  horizontal: h,
  vertical: v,
  wrapText: false,
});

function cell(
  value: string | number | Date,
  opts: {
    bold?: boolean;
    fgColor?: string;
    fontColor?: string;
    numFmt?: string;
    halign?: string;
    sz?: number;
    type?: string;
  } = {}
): XLSX.CellObject {
  const t = (opts.type ?? (typeof value === "number" ? "n" : "s")) as XLSX.ExcelDataType;
  return {
    v: value,
    t,
    s: {
      font: font({ bold: opts.bold, color: opts.fontColor, sz: opts.sz }),
      fill: fill(opts.fgColor ?? "FFFFFF"),
      border: border(),
      alignment: align(opts.halign ?? (t === "n" ? "right" : "left")),
    },
    ...(opts.numFmt ? { z: opts.numFmt } : {}),
  };
}

// ── Constants ────────────────────────────────────────────────────────────────
const IDR_FMT = '#,##0;[Red]-#,##0';
const DATE_FMT = 'DD/MM/YYYY';

const H_BG   = "1A1A2E"; // header dark navy
const H_FG   = "FFFFFF"; // header white text
const EXP_BG = "FFF0F0"; // expense light red
const INC_BG = "F0FFF4"; // income light green
const EXP_FG = "C0392B"; // expense red text
const INC_FG = "27AE60"; // income green text
const TOT_BG = "ECE9FF"; // total purple bg
const TOT_FG = "5B21B6"; // total purple text
const SUM_BG = "F5F5F5"; // summary grey
const SEC_BG = "1A1A2E"; // section header navy
const MNT_BG = "E8E4FF"; // month header lavender
const MNT_FG = "5B21B6";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const [txList, acctList] = await Promise.all([
    listTransactions(userId, { type: "all", category: "all" }),
    listAccounts(userId),
  ]);

  const acctMap = new Map(acctList.map((a) => [a.id, a.name]));
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Transaksi ────────────────────────────────────────────────────
  const wsData: XLSX.CellObject[][] = [];

  // Header row
  wsData.push([
    cell("No",           { bold: true, fgColor: H_BG, fontColor: H_FG, halign: "center" }),
    cell("Tanggal",      { bold: true, fgColor: H_BG, fontColor: H_FG, halign: "center" }),
    cell("Hari",         { bold: true, fgColor: H_BG, fontColor: H_FG, halign: "center" }),
    cell("Akun",         { bold: true, fgColor: H_BG, fontColor: H_FG }),
    cell("Kategori",     { bold: true, fgColor: H_BG, fontColor: H_FG }),
    cell("Catatan",      { bold: true, fgColor: H_BG, fontColor: H_FG }),
    cell("Tipe",         { bold: true, fgColor: H_BG, fontColor: H_FG, halign: "center" }),
    cell("Jumlah (Rp)",  { bold: true, fgColor: H_BG, fontColor: H_FG, halign: "right" }),
  ]);

  txList.forEach((tx, i) => {
    const isExpense = tx.type === "expense";
    const d = new Date(tx.date);
    const bg  = isExpense ? EXP_BG : INC_BG;
    const fg  = isExpense ? EXP_FG : INC_FG;
    const catLabel = tx.catName || STR.cat[tx.cat as keyof typeof STR.cat] || tx.cat;
    const amt = isExpense ? -tx.amount : tx.amount;

    wsData.push([
      cell(i + 1,              { fgColor: bg, halign: "center" }),
      cell(d,                  { fgColor: bg, numFmt: DATE_FMT, halign: "center", type: "d" }),
      cell(DAYS[d.getDay()],   { fgColor: bg, halign: "center" }),
      cell(acctMap.get(tx.accountId ?? "") ?? "-", { fgColor: bg }),
      cell(catLabel,           { fgColor: bg }),
      cell(tx.note || "-",     { fgColor: bg }),
      cell(isExpense ? "Pengeluaran" : "Pemasukan", {
        fgColor: bg, fontColor: fg, bold: true, halign: "center",
      }),
      cell(amt, { fgColor: bg, fontColor: fg, bold: true, numFmt: IDR_FMT }),
    ]);
  });

  // Totals row
  const totalIncome  = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  wsData.push([
    cell("",      { fgColor: TOT_BG }),
    cell("",      { fgColor: TOT_BG }),
    cell("",      { fgColor: TOT_BG }),
    cell("",      { fgColor: TOT_BG }),
    cell("",      { fgColor: TOT_BG }),
    cell("TOTAL", { bold: true, fgColor: TOT_BG, fontColor: TOT_FG, halign: "right" }),
    cell("",      { fgColor: TOT_BG }),
    cell(net, { bold: true, fgColor: TOT_BG, fontColor: TOT_FG, numFmt: IDR_FMT }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 5  }, // No
    { wch: 13 }, // Tanggal
    { wch: 10 }, // Hari
    { wch: 18 }, // Akun
    { wch: 18 }, // Kategori
    { wch: 32 }, // Catatan
    { wch: 13 }, // Tipe
    { wch: 18 }, // Jumlah
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = { ref: `A1:H1` };

  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");

  // ── Sheet 2: Ringkasan ────────────────────────────────────────────────────
  const ws2Data: XLSX.CellObject[][] = [];

  const addSectionHeader = (label: string) => {
    ws2Data.push([
      cell(label, { bold: true, fgColor: SEC_BG, fontColor: H_FG, sz: 11 }),
      cell("",    { fgColor: SEC_BG }),
    ]);
  };

  const addKV = (label: string, value: number | string, numFmt?: string, bg = SUM_BG) => {
    ws2Data.push([
      cell(label,  { fgColor: bg }),
      cell(value as any, { fgColor: bg, numFmt, halign: "right" }),
    ]);
  };

  const idrSummFmt = '"Rp "#,##0;[Red]"Rp "-#,##0';

  ws2Data.push([cell("", { fgColor: "FFFFFF" }), cell("", { fgColor: "FFFFFF" })]); // spacer
  addSectionHeader("Ringkasan Keseluruhan");
  addKV("Total Pemasukan",   totalIncome,   idrSummFmt, INC_BG);
  addKV("Total Pengeluaran", totalExpense,  idrSummFmt, EXP_BG);
  addKV("Selisih (Net)",     net,           idrSummFmt, TOT_BG);
  addKV("Jumlah Transaksi",  txList.length);

  ws2Data.push([cell("", { fgColor: "FFFFFF" }), cell("", { fgColor: "FFFFFF" })]); // spacer

  // Breakdown by category
  const catTotals = new Map<string, number>();
  txList
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const label = t.catName || STR.cat[t.cat as keyof typeof STR.cat] || t.cat;
      catTotals.set(label, (catTotals.get(label) ?? 0) + t.amount);
    });
  const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedCats.length > 0) {
    addSectionHeader("Pengeluaran per Kategori");
    for (const [label, amt] of sortedCats) addKV(label, amt, idrSummFmt);
    ws2Data.push([cell("", { fgColor: "FFFFFF" }), cell("", { fgColor: "FFFFFF" })]); // spacer
  }

  // Breakdown by month (4 columns)
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
    // Section header spanning 4 cols — add extra blank cells
    ws2Data.push([
      cell("Ringkasan per Bulan", { bold: true, fgColor: SEC_BG, fontColor: H_FG, sz: 11 }),
      cell("", { fgColor: SEC_BG }),
      cell("", { fgColor: SEC_BG }),
      cell("", { fgColor: SEC_BG }),
    ]);
    ws2Data.push([
      cell("Bulan",       { bold: true, fgColor: MNT_BG, fontColor: MNT_FG, halign: "center" }),
      cell("Pemasukan",   { bold: true, fgColor: MNT_BG, fontColor: MNT_FG, halign: "right" }),
      cell("Pengeluaran", { bold: true, fgColor: MNT_BG, fontColor: MNT_FG, halign: "right" }),
      cell("Net",         { bold: true, fgColor: MNT_BG, fontColor: MNT_FG, halign: "right" }),
    ]);
    for (const [month, { income, expense }] of sortedMonths) {
      const [yr, mo] = month.split("-");
      const label = `${new Date(Number(yr), Number(mo) - 1).toLocaleString("id-ID", { month: "long" })} ${yr}`;
      ws2Data.push([
        cell(label,            { fgColor: SUM_BG }),
        cell(income,           { fgColor: SUM_BG, numFmt: idrSummFmt }),
        cell(expense,          { fgColor: SUM_BG, numFmt: idrSummFmt }),
        cell(income - expense, { fgColor: SUM_BG, numFmt: idrSummFmt }),
      ]);
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2["!cols"] = [{ wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Ringkasan");

  // ── Serialize ─────────────────────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transaksi-kacek-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
