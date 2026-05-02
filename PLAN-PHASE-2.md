# KaCek — Phase 2: Missing Screens + Mobile-First Responsive

> Status: **COMPLETED**. Semua screen utama (Dashboard, Transaksi, Anggaran, Tujuan) sudah aktif dan responsif.
> Phase 3 (Advanced Features) sudah dimulai: Transaksi Berulang & Ekspor CSV.

## Konteks

Phase 1 sudah jadi: dashboard "Ringkasan" desktop-only (1440px fixed) dengan auth + Drizzle + Turso. Phase 2 telah menyelesaikan:

1. **Semua layar aktif** (`Transaksi`, `Anggaran`, `Tujuan`)
2. **Edit/delete transaction** penuh
3. **Mobile-first responsive** dengan Bottom Nav & FAB
4. **Analitik Dinamis** (Filter Minggu/Bulan/Tahun)
5. **Ekspor CSV** & **Transaksi Berulang** (Initial Phase 3)

Phase 2 = handle ketiganya sekaligus karena ngerjain mobile sambil bangun screen baru lebih efisien daripada refactor terpisah.

---

## Strategi Responsive

### Pendekatan styling

Saat ini semua pakai **inline styles** dengan theme tokens. Inline styles **tidak bisa media query**, jadi bagian-bagian responsive perlu dipindah ke CSS class.

**Aturan baru:**
- **Layout & sizing yang berubah per breakpoint** → CSS class di [app/app.css](app/app.css) (grid template, flex direction, padding, font-size, gap, hide/show)
- **Theme-dependent values** (warna, gradient, glow shadow) → tetap inline style (karena bergantung pada `T` / `theme` prop)
- **Static styling** (border-radius, transitions) → boleh di mana saja, prefer CSS class

### Breakpoints

```css
/* mobile-first; semua default = mobile */
@media (min-width: 640px)  { /* sm — phone landscape / small tablet */ }
@media (min-width: 768px)  { /* md — tablet */ }
@media (min-width: 1024px) { /* lg — laptop */ }
@media (min-width: 1280px) { /* xl — desktop */ }
```

Match Tailwind's defaults supaya gampang ditambahin Tailwind utilities kalau perlu.

### Pola layout per screen

| Screen | Mobile (default) | Tablet (`md`) | Desktop (`lg`+) |
|---|---|---|---|
| **Header** | Logo + ham menu + theme toggle. Search & nav disembunyikan. Avatar di dalam menu. | Tambah search bar. | Full nav inline + search + notif + avatar (current). |
| **SummaryRow** | 1 kolom stack. Hero card full-width on top. | 2 kolom (hero full-width, balance + income side-by-side). | 3 kolom (current). |
| **AnalyticsAndForm** | Donut card di atas, form **bottom sheet** yang dibuka dari FAB. | Donut full-width, form di bawah (atau sheet). | Side-by-side (current). |
| **TxList** | List dengan icon kecil + amount; date di bawah. Filter chips bisa scroll horizontal. | + filter chips inline. | Full (current). |
| **Transaksi page** | Same as TxList tapi full-page; pakai segment date headers; swipe-to-delete. | Tabel ringkas. | Full table + sidebar filters. |
| **Anggaran page** | Card per kategori, stacked. | 2 kolom grid. | 3 kolom grid + summary card di samping. |
| **Tujuan page** | 1 goal per row stacked. | 2 kolom grid. | 3 kolom grid. |

### Mobile pattern penting

- **Bottom navigation bar** (sticky bottom, iOS-style) saat `< md` menggantikan nav inline di header. 4 ikon: Ringkasan / Transaksi / Anggaran / Tujuan + label. Header jadi simpler (cuma logo + toggle).
- **FAB** (Floating Action Button) bulat di kanan-bawah untuk "+ Tambah Transaksi" — ngebuka bottom sheet dengan form. Posisinya `position: fixed; bottom: 88px; right: 20px;` (di atas bottom nav). Hanya muncul `< md`.
- **Bottom sheet** untuk form add/edit transaksi di mobile. Pakai `<dialog>` native + CSS animasi slide-up. Di `md+` tetap inline card.
- **Touch targets** minimum 44×44px.
- **Horizontal scroll** untuk filter chips dengan `overflow-x: auto; scroll-snap-type: x;`

### File yang perlu di-refactor

- [app/app.css](app/app.css) — tambah utility classes responsive: `.kc-grid-summary`, `.kc-grid-analytics`, `.kc-header-desktop`, `.kc-bottom-nav`, `.kc-fab`, `.kc-bottom-sheet` + media queries
- [app/components/dashboard/header.tsx](app/components/dashboard/header.tsx) — split jadi `HeaderDesktop` + `HeaderMobile`. Keduanya selalu render, CSS yang hide/show.
- [app/components/dashboard/summary-row.tsx](app/components/dashboard/summary-row.tsx) — ganti `gridTemplateColumns` inline ke className `kc-grid-summary`
- [app/components/dashboard/analytics-and-form.tsx](app/components/dashboard/analytics-and-form.tsx) — split: extract `<AddTransactionForm />` jadi reusable component, di mobile dibungkus bottom sheet, di desktop tetap inline
- [app/components/dashboard/tx-list.tsx](app/components/dashboard/tx-list.tsx) — adjust filter chips untuk overflow scroll
- [app/components/bottom-nav.tsx](app/components/bottom-nav.tsx) — **NEW**, bottom nav untuk mobile
- [app/components/bottom-sheet.tsx](app/components/bottom-sheet.tsx) — **NEW**, reusable sheet modal
- [app/components/fab.tsx](app/components/fab.tsx) — **NEW**, FAB untuk add transaction
- [app/routes/_app.tsx](app/routes/_app.tsx) — render BottomNav + FAB sebagai bagian protected layout supaya muncul di semua app screens

---

## Schema changes

Tambah 2 tabel + extend transactions untuk soft-edit:

```ts
// app/db/schema.ts (additions)
export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category", { enum: [...CATEGORIES] }).notNull(),
  amount: integer("amount").notNull(),  // rupiah, monthly cap
  month: text("month").notNull(),       // "YYYY-MM"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Unique per (userId, category, month)

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  deadline: integer("deadline", { mode: "timestamp" }),  // optional
  emoji: text("emoji"),                  // user picks an emoji icon
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

`transactions` table sudah cukup (id sebagai PK bisa dipakai untuk edit/delete).

Migration: `npm run db:push` setelah schema diubah.

---

## 1. Navigation refactor

### Routes baru (file-based)

Update [app/routes.ts](app/routes.ts):

```ts
layout("routes/_app.tsx", [
  index("routes/_app.dashboard.tsx"),                    // /  → Ringkasan
  route("transaksi", "routes/_app.transaksi.tsx"),       // /transaksi
  route("transaksi/:id", "routes/_app.transaksi.$id.tsx"),// /transaksi/abc → edit
  route("anggaran", "routes/_app.anggaran.tsx"),         // /anggaran
  route("tujuan", "routes/_app.tujuan.tsx"),             // /tujuan
]),

route("action/transaction/:id/delete", "routes/action.transaction.$id.delete.tsx"),
route("action/transaction/:id/update", "routes/action.transaction.$id.update.tsx"),
route("action/budget", "routes/action.budget.tsx"),
route("action/goal", "routes/action.goal.tsx"),
route("action/goal/:id/delete", "routes/action.goal.$id.delete.tsx"),
```

### Header / BottomNav nav-link

- Pakai `<NavLink>` dari `react-router` — ada `isActive` callback untuk styling pill aktif
- Mobile: BottomNav fixed bottom, 4 icon + label
- Desktop: tetap pill nav di header (current style)

---

## 2. Transaksi screen ([app/routes/_app.transaksi.tsx](app/routes/_app.transaksi.tsx))

### UI

**Mobile:**
- Sticky filter bar di atas (search + chip kategori scrollable)
- List items grouped by date (`Hari ini`, `Kemarin`, `27 Apr`, ...)
- Tap row → open detail bottom sheet (edit/delete)
- Long-press atau swipe → quick delete (V2, skip dulu)

**Desktop:**
- Sidebar kiri: filter (date range, category checkboxes, type radio, amount range)
- Main: tabel dengan kolom Tanggal · Kategori · Catatan · Jumlah · Aksi
- Row hover → tampil tombol Edit / Delete

### Loader

```ts
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("cat") ?? "all",
    type: url.searchParams.get("type") ?? "all",
    from: url.searchParams.get("from"),    // YYYY-MM-DD
    to: url.searchParams.get("to"),
  };
  return { transactions: await listTransactions(userId, filters), filters };
}
```

[app/lib/queries.server.ts](app/lib/queries.server.ts) — tambah `listTransactions(userId, filters)` dengan Drizzle `where(and(...))`.

### Filter via URL params

- `?cat=food&type=expense&q=tartine&from=2026-04-01&to=2026-04-30`
- Form filter pakai `<Form method="get">` — auto sync ke URL, share-able, browser back works

### Edit modal/page

- Mobile: bottom sheet
- Desktop: navigate ke `/transaksi/:id` (page) atau modal — pilih bottom sheet juga supaya konsisten
- Form pre-fill dari loader `transactions/:id`
- Action: `POST /action/transaction/:id/update`

### Delete

- Confirm dialog kecil
- `<Form method="post" action={`/action/transaction/${id}/delete`}>`
- Optimistic UI (optional): `useFetcher` → row hilang langsung sebelum response

---

## 3. Anggaran screen ([app/routes/_app.anggaran.tsx](app/routes/_app.anggaran.tsx))

### UI

**Per kategori card:**
```
┌─────────────────────────┐
│ 🍽 Makanan & Minuman    │
│ Rp 6.420.000 / Rp 8jt   │
│ ████████░░░░ 80%        │  ← warning kuning
│ [Edit anggaran]         │
└─────────────────────────┘
```

- Color cue: <50% accent, 50-80% violet, >80% red
- Total summary card di atas: total budget bulan ini, total spent, sisa
- "Edit anggaran" → bottom sheet dengan input angka

**Default budget per category** kalau user belum set:
```ts
const DEFAULT_BUDGETS = { food: 5_000_000, transport: 2_000_000, bills: 4_000_000, entertainment: 1_500_000, shopping: 2_500_000 };
```

### Loader

```ts
const month = formatYYYYMM(new Date());
const budgets = await db.select().from(budgetsTable).where(and(eq(userId), eq(month)));
const spending = await getMonthlySpendingByCategory(userId, month);
```

### Action

`POST /action/budget` body: `{ category, amount, month }` → upsert (Drizzle `onConflictDoUpdate`).

---

## 4. Tujuan screen ([app/routes/_app.tujuan.tsx](app/routes/_app.tujuan.tsx))

### UI

**Per goal card:**
```
┌─────────────────────────┐
│ 🏖 Liburan ke Bali       │
│ Rp 5jt / Rp 15jt (33%)  │
│ ⊙────────── ring chart  │
│ Sisa 4 bulan            │
│ [+ Tambah]  [Edit]  [×] │
└─────────────────────────┘
```

- Ring progress (SVG, sama math kayak donut)
- Tombol "+ Tambah" → bottom sheet input nominal → naikkan `currentAmount`
- Empty state besar dengan CTA "Buat Tujuan Pertama"

### Schema action endpoints

- `POST /action/goal` (create) — body: `name, targetAmount, deadline?, emoji?`
- `POST /action/goal` (update) — body: `id, ...fields`
- `POST /action/goal/:id/delete`
- `POST /action/goal/:id/contribute` — body: `amount` → `UPDATE goals SET currentAmount = currentAmount + amount`

---

## 5. Edit / Delete transaction (cross-cutting)

### TxRow click behavior

Update [app/components/tx-row.tsx](app/components/tx-row.tsx):
- Wrap pakai `<button>` atau navigate trigger → buka detail sheet
- Atau di-pass `onClick` prop dari parent

### Detail / edit sheet

Component baru [app/components/transaction-edit-sheet.tsx](app/components/transaction-edit-sheet.tsx):
- Reuse form fields dari `<AddTransactionForm />` — extract dulu jadi shared component
- Mode `add` vs `edit` — kalau edit, pre-fill dari prop `transaction`
- Action: `add` → `/action/transaction`, `edit` → `/action/transaction/:id/update`
- Tombol Delete di edit mode

### Delete confirmation

Inline confirm pakai 2-step button: klik delete → tombol jadi "Yakin? Klik lagi" 3 detik → klik lagi submit. Hindari modal extra.

---

## 6. Update existing dashboard ([app/routes/_app.dashboard.tsx](app/routes/_app.dashboard.tsx))

- TxList rows → bisa di-klik untuk edit (sama detail sheet)
- Hapus inline form di mobile → ganti FAB → sheet
- Header sudah punya tombol logout, biarin

---

## Order of execution

Eksekusi besok (urut bottom-up agar bisa test tiap step):

### Step 1 — Foundation responsive (~ 30 menit)
1. Tambah utility classes responsive di [app/app.css](app/app.css): `.kc-grid-summary`, `.kc-grid-analytics`, `.kc-only-mobile`, `.kc-only-desktop`, `.kc-fab`, `.kc-bottom-nav`, `.kc-bottom-sheet`, `.kc-touch-target`
2. Update root container di [app/routes/_app.dashboard.tsx](app/routes/_app.dashboard.tsx): `padding: 16` di mobile, `28` di desktop (CSS class)
3. Buat [app/components/bottom-sheet.tsx](app/components/bottom-sheet.tsx) (basic, native `<dialog>`)
4. Buat [app/components/bottom-nav.tsx](app/components/bottom-nav.tsx) (4 NavLink + icons)
5. Buat [app/components/fab.tsx](app/components/fab.tsx)
6. Render BottomNav + FAB di [app/routes/_app.tsx](app/routes/_app.tsx) layout

### Step 2 — Refactor existing dashboard ke responsive (~ 45 menit)
7. SummaryRow → CSS grid responsive (1 → 2 → 3 cols)
8. AnalyticsAndForm → extract `<AddTransactionForm />` jadi component sendiri di [app/components/transaction-form.tsx](app/components/transaction-form.tsx)
9. AnalyticsAndForm → di mobile, sembunyikan form (FAB yang handle), di desktop tetap inline
10. Header → split jadi mobile (logo + ham + toggle) vs desktop (full)
11. Test di chrome devtools mobile preview (375×667 iPhone SE), 768 (iPad), 1440 (desktop)

### Step 3 — Schema & queries (~ 20 menit)
12. Tambah `budgets` + `goals` di [app/db/schema.ts](app/db/schema.ts)
13. `npm run db:push` ke local
14. Tambah helpers di [app/lib/queries.server.ts](app/lib/queries.server.ts): `listTransactions`, `getTransaction`, `getBudgetsForMonth`, `getMonthlySpendingByCategory`, `listGoals`

### Step 4 — Transaksi screen (~ 60 menit)
15. Buat route [app/routes/_app.transaksi.tsx](app/routes/_app.transaksi.tsx) dengan loader
16. UI list dengan date grouping
17. Filter bar (mobile: chips horizontal, desktop: sidebar)
18. Search box (Form method="get")
19. Click row → open edit sheet (reuse `transaction-form.tsx`)
20. Action [routes/action.transaction.$id.update.tsx](app/routes/action.transaction.$id.update.tsx) + [routes/action.transaction.$id.delete.tsx](app/routes/action.transaction.$id.delete.tsx)
21. Update FAB onClick → buka sheet "tambah" mode

### Step 5 — Anggaran screen (~ 45 menit)
22. Buat route [app/routes/_app.anggaran.tsx](app/routes/_app.anggaran.tsx)
23. Card per category dengan progress bar
24. Total summary card
25. Edit sheet (input amount per category)
26. Action [routes/action.budget.tsx](app/routes/action.budget.tsx) (upsert)

### Step 6 — Tujuan screen (~ 45 menit)
27. Buat route [app/routes/_app.tujuan.tsx](app/routes/_app.tujuan.tsx)
28. Goal card dengan ring progress (SVG arc, reuse donut math)
29. Empty state
30. Add/edit goal sheet
31. Contribute sheet (`+ Tambah` button)
32. Actions [routes/action.goal.tsx](app/routes/action.goal.tsx) + [routes/action.goal.$id.delete.tsx](app/routes/action.goal.$id.delete.tsx)

### Step 7 — Polish & verifikasi (~ 30 menit)
33. Test full flow di mobile preview: login → dashboard → tambah transaksi via FAB → cek di transaksi list → edit → delete → set anggaran → buat tujuan → tambah kontribusi
34. Test theme toggle di setiap screen
35. Test dengan user kosong (empty states)
36. Run `npm run typecheck` + `npm run build` — harus clean
37. Update [README.md](README.md) — tambah daftar fitur baru

### Step 8 — Deploy (last)
38. Buat Turso database production
39. Push schema ke Turso
40. Push ke GitHub
41. Connect Vercel + set env vars
42. Verifikasi production URL

**Total estimate: ~5-6 jam fokus.**

---

## Files yang akan dibuat / diubah

**Baru:**
- [app/components/bottom-nav.tsx](app/components/bottom-nav.tsx)
- [app/components/bottom-sheet.tsx](app/components/bottom-sheet.tsx)
- [app/components/fab.tsx](app/components/fab.tsx)
- [app/components/transaction-form.tsx](app/components/transaction-form.tsx) — extracted reusable form
- [app/components/transaction-edit-sheet.tsx](app/components/transaction-edit-sheet.tsx)
- [app/components/budget-card.tsx](app/components/budget-card.tsx)
- [app/components/goal-card.tsx](app/components/goal-card.tsx)
- [app/components/ring-progress.tsx](app/components/ring-progress.tsx) — SVG ring
- [app/routes/_app.transaksi.tsx](app/routes/_app.transaksi.tsx)
- [app/routes/_app.anggaran.tsx](app/routes/_app.anggaran.tsx)
- [app/routes/_app.tujuan.tsx](app/routes/_app.tujuan.tsx)
- [app/routes/action.transaction.$id.update.tsx](app/routes/action.transaction.$id.update.tsx)
- [app/routes/action.transaction.$id.delete.tsx](app/routes/action.transaction.$id.delete.tsx)
- [app/routes/action.budget.tsx](app/routes/action.budget.tsx)
- [app/routes/action.goal.tsx](app/routes/action.goal.tsx)
- [app/routes/action.goal.$id.delete.tsx](app/routes/action.goal.$id.delete.tsx)
- [app/routes/action.goal.$id.contribute.tsx](app/routes/action.goal.$id.contribute.tsx)

**Diubah:**
- [app/app.css](app/app.css) — utility classes responsive
- [app/db/schema.ts](app/db/schema.ts) — `budgets`, `goals` tables
- [app/lib/queries.server.ts](app/lib/queries.server.ts) — list/get helpers
- [app/lib/i18n.ts](app/lib/i18n.ts) — string baru untuk anggaran, tujuan
- [app/routes.ts](app/routes.ts) — route baru
- [app/routes/_app.tsx](app/routes/_app.tsx) — render BottomNav + FAB
- [app/routes/_app.dashboard.tsx](app/routes/_app.dashboard.tsx) — responsive cleanup
- [app/components/dashboard/header.tsx](app/components/dashboard/header.tsx) — split mobile/desktop, NavLink
- [app/components/dashboard/summary-row.tsx](app/components/dashboard/summary-row.tsx) — responsive grid
- [app/components/dashboard/analytics-and-form.tsx](app/components/dashboard/analytics-and-form.tsx) — extract form, hide on mobile
- [app/components/dashboard/tx-list.tsx](app/components/dashboard/tx-list.tsx) — clickable rows
- [app/components/tx-row.tsx](app/components/tx-row.tsx) — clickable, mobile-friendly
- [README.md](README.md) — dokumentasi fitur baru

---

## Verifikasi (akhir Phase 2)

- [ ] Login + dashboard di mobile (375×667): semua section stack vertikal, BottomNav muncul, FAB muncul
- [ ] Tap FAB → sheet add tx → submit → muncul di list
- [ ] Navigate ke `/transaksi` via BottomNav
- [ ] Filter transaksi by kategori + search → URL sync
- [ ] Tap row → edit sheet → ubah jumlah → save → list update
- [ ] Delete transaksi → konfirm → hilang
- [ ] `/anggaran` → card per kategori, progress bar warna sesuai persentase
- [ ] Edit anggaran 1 kategori → total summary update
- [ ] `/tujuan` → empty state → buat goal "Liburan ke Bali" Rp 15jt → muncul di grid
- [ ] Kontribusi Rp 1jt → ring progress 6.7% (1jt / 15jt)
- [ ] Edit goal → ubah target → save
- [ ] Delete goal → konfirm → hilang
- [ ] Theme toggle di setiap screen — semua flip mulus
- [ ] Resize browser 375 → 768 → 1280 — layout transisi smooth, gak ada overflow horizontal
- [ ] `npm run typecheck` clean, `npm run build` sukses

---

## Out of scope (Phase 3)

- Edit/delete transaction inline di dashboard tx list (cuma di /transaksi page)
- Search transactions di header search bar (cuma cosmetic sekarang)
- Push notifications (bell icon cosmetic)
- Multiple budgets per kategori per period selain bulanan
- Goal categories / tags
- Export CSV/PDF
- Recurring transactions
