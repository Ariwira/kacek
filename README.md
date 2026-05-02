# KaCek — Premium Expense Tracker

Mobile-first expense tracker dengan dark/light mode, glassmorphism, dan analitik kategori.
Bahasa Indonesia · IDR · React Router v7 · Drizzle + Turso (LibSQL).

## Fitur

- **Ringkasan** — dashboard utama: total pengeluaran bulan ini (vs anggaran), saldo, pemasukan, donut chart kategori, daftar transaksi terbaru
- **Transaksi** — list lengkap dengan filter (search, kategori, tipe), tap row untuk edit/hapus, group by tanggal
- **Anggaran** — atur budget per kategori per bulan, lihat progress bar (warna berubah pada >70% dan >90%), summary total terpakai vs sisa
- **Tujuan** — buat target tabungan dengan ring progress, kontribusi nominal, tenggat opsional, emoji label
- **Mobile-first responsive** — bottom navigation, FAB + bottom sheet untuk add tx, CSS grid 1→2→3 cols, touch targets ≥44px
- Dark/Light theme toggle (cookie-persistent)
- Email/password auth (sessions via signed cookie, `bcryptjs`)

## Tech Stack

- React Router v7 (framework mode) + Vite + TypeScript
- Drizzle ORM + LibSQL (Turso untuk produksi, file SQLite lokal untuk dev)
- Email/password auth dengan cookie session (`bcryptjs`)
- Plus Jakarta Sans + JetBrains Mono
- Deploy target: Vercel

## Setup Lokal

```bash
npm install
cp .env.example .env
# Generate session secret:
#   openssl rand -base64 48
# dan paste ke SESSION_SECRET di .env

# Push schema ke local SQLite (file:./local.db)
npm run db:push

npm run dev
```

Buka http://localhost:5173 — akan redirect ke `/login`. Daftar akun baru di `/register`.

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Dev server di port 5173 |
| `npm run build` | Production build |
| `npm run start` | Jalankan production build |
| `npm run typecheck` | Typegen + tsc |
| `npm run db:push` | Push schema langsung (cocok untuk dev) |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio (DB browser) |

## Deploy ke Vercel + Turso

1. **Buat database Turso** (https://turso.tech) — free tier:
   ```
   turso db create kacek
   turso db show kacek --url        # → TURSO_DATABASE_URL
   turso db tokens create kacek     # → TURSO_AUTH_TOKEN
   ```
2. **Push schema** ke Turso production:
   ```bash
   TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npm run db:push
   ```
3. **Push repo ke GitHub**, lalu di Vercel:
   - Import project
   - Set environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`
   - Deploy

Build & dev sudah dikonfigurasi pakai React Router v7 default Vercel-compatible output.

## Struktur

```
app/
  app.css                       # Global styles + responsive utility classes
  components/
    dashboard/                  # Header, SummaryRow, AnalyticsAndForm, TxList
    theme.ts                    # Color tokens (dark + light)
    icons.tsx, icons-extra.tsx  # SVG icons + CatIcon
    glass-card.tsx
    theme-toggle.tsx
    bottom-nav.tsx              # Mobile bottom navigation (4 tabs)
    bottom-sheet.tsx            # Reusable sheet modal (form host)
    fab.tsx                     # Floating "+" add tx (mobile)
    transaction-form.tsx        # Reusable add/edit form
    ring-progress.tsx           # SVG ring (used in Tujuan)
    sparkline.tsx, tx-row.tsx
  db/schema.ts                  # users, transactions, budgets, goals
  lib/
    auth.server.ts              # Session storage + register/login/logout
    db.server.ts                # Drizzle client (Turso/LibSQL)
    queries.server.ts           # Dashboard, transaction filter, budget view, goals
    theme.server.ts             # Theme cookie
    format.ts                   # IDR/date formatters
    i18n.ts                     # Bahasa Indonesia copy
    mock-data.ts                # First-login fallback content
  routes/
    _auth.tsx                   # Auth layout
    _auth.login.tsx
    _auth.register.tsx
    _app.tsx                    # Protected layout — renders BottomNav + FAB + add sheet
    _app.dashboard.tsx          # /
    _app.transaksi.tsx          # /transaksi (filter, edit, delete)
    _app.anggaran.tsx           # /anggaran (per-category budgets)
    _app.tujuan.tsx             # /tujuan (savings goals)
    action.transaction.tsx                  # POST /action/transaction (create)
    action.transaction.update.tsx           # POST /action/transaction/:id/update
    action.transaction.delete.tsx           # POST /action/transaction/:id/delete
    action.budget.tsx                       # POST /action/budget (upsert)
    action.goal.tsx                         # POST /action/goal (create or update)
    action.goal.delete.tsx                  # POST /action/goal/:id/delete
    action.goal.contribute.tsx              # POST /action/goal/:id/contribute
    action.theme.tsx                        # Toggle dark/light cookie
    action.logout.tsx
  root.tsx                      # Fonts + theme cookie + html data-theme
  routes.ts                     # Route config
```

## Responsive

Mobile-first dengan breakpoint Tailwind-style (`640 / 768 / 1024 / 1280`). Layout responsive lewat CSS classes di [app/app.css](app/app.css), theme tokens & dynamic colors tetap inline.

| Breakpoint | Layout |
|---|---|
| `< 768px` | 1-col stack, BottomNav (4 tab), FAB + bottom sheet untuk add tx, search & nav disembunyikan dari header |
| `768px+` | 2-col summary cards, search bar muncul di header |
| `1024px+` | 3-col summary, donut + form side-by-side, full nav inline |
