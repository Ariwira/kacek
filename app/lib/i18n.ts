export const STR = {
  brand: "KaCek",
  brandTagline: "Personal",
  nav: ["Ringkasan", "Transaksi", "Anggaran", "Tujuan"] as const,
  searchPlaceholder: "Cari transaksi…",

  // Summary cards
  totalExpensesThisMonth: "Total Pengeluaran · Bulan Ini",
  monthlyBudget: "anggaran bulanan",
  last7Days: "7 hari terakhir",
  currentBalance: "Saldo Saat Ini",
  receivedToday: "diterima hari ini",
  income: "Pemasukan",
  vsLastMonth: "vs bulan lalu",
  trend12Weeks: "Tren · 12 minggu",

  // Analytics
  spendingByCategory: "Pengeluaran per kategori",
  monthCategoriesCount: (count: number, monthName: string) =>
    `${monthName} · ${count} kategori`,
  rangeWeek: "Minggu",
  rangeMonth: "Bulan",
  rangeYear: "Tahun",
  donutTotal: "Total",

  // Form
  addTransaction: "Tambah transaksi",
  addTransactionTagline: "Catat cepat — kategori otomatis.",
  expense: "Pengeluaran",
  incomeShort: "Pemasukan",
  amount: "Jumlah",
  category: "Kategori",
  date: "Tanggal",
  note: "Catatan",
  notePlaceholder: "tambah keterangan",
  todayLabel: (formatted: string) => `Hari ini, ${formatted}`,
  addTransactionBtn: "Tambah Transaksi",

  // List
  recentActivity: "Aktivitas terbaru",
  recentSubtitle: (n: number) => `7 hari terakhir · ${n} transaksi`,
  filterAll: "Semua",
  filterExpense: "Pengeluaran",
  filterIncome: "Pemasukan",
  viewAll: "Lihat semua",
  netThisWeek: "Net minggu ini",

  // Auth
  login: "Masuk",
  loginCta: "Masuk ke KaCek",
  loginSubtitle: "Lacak pengeluaranmu dengan mudah dan elegan.",
  register: "Daftar",
  registerCta: "Daftar Akun Baru",
  registerSubtitle: "Mulai kelola keuanganmu dalam hitungan detik.",
  email: "Email",
  password: "Password",
  name: "Nama",
  noAccount: "Belum punya akun?",
  haveAccount: "Sudah punya akun?",
  logout: "Keluar",

  // Transaksi page
  txPageTitle: "Transaksi",
  txPageSubtitle: (n: number) => `${n} transaksi tercatat`,
  txEmpty: "Belum ada transaksi yang cocok dengan filter ini.",
  txEmptyAll: "Belum ada transaksi. Tambahkan yang pertama via tombol +.",
  filter: "Filter",
  filterReset: "Reset",
  filterApply: "Terapkan",
  filterDateRange: "Rentang tanggal",
  searchPlaceholderFull: "Cari catatan transaksi…",
  editTx: "Edit transaksi",
  deleteTxConfirm: "Yakin hapus transaksi ini?",
  deleteTxCta: "Hapus",

  // Anggaran page
  budgetPageTitle: "Anggaran",
  budgetPageSubtitle: (m: string) => `${m} · per kategori`,
  budgetTotal: "Total anggaran",
  budgetSpent: "Sudah terpakai",
  budgetRemaining: "Sisa",
  budgetUsed: (pct: number) => `${pct}% terpakai`,
  budgetEdit: "Atur anggaran",
  budgetSave: "Simpan anggaran",

  // Tujuan page
  goalsPageTitle: "Tujuan",
  goalsPageSubtitle: (n: number) =>
    n === 0 ? "Belum ada tujuan" : `${n} tujuan aktif`,
  goalsEmpty: "Buat tujuan pertama untuk mulai menabung dengan tujuan jelas.",
  goalsEmptyCta: "Buat Tujuan Pertama",
  goalNew: "Tujuan baru",
  goalEdit: "Edit tujuan",
  goalName: "Nama tujuan",
  goalNamePlaceholder: "cth. Liburan ke Bali",
  goalTarget: "Target nominal",
  goalDeadline: "Tenggat (opsional)",
  goalEmoji: "Emoji (opsional)",
  goalEmojiPlaceholder: "🏖",
  goalCreate: "Buat Tujuan",
  goalSave: "Simpan",
  goalDelete: "Hapus",
  goalContribute: "+ Tambah",
  goalContributeTitle: "Tambah ke tujuan",
  goalContributeAmount: "Nominal kontribusi",
  goalContributeCta: "Tambahkan",
  goalProgress: (pct: number) => `${pct}% tercapai`,
  goalRemaining: (rp: string) => `Sisa ${rp}`,
  goalDeadlineLeft: (days: number) =>
    days > 0
      ? `Sisa ${days} hari`
      : days === 0
        ? "Tenggat hari ini"
        : `Lewat tenggat ${Math.abs(days)} hari`,

  // Categories
  cat: {
    food: "Makanan & Minuman",
    transport: "Transportasi",
    bills: "Tagihan & Utilitas",
    entertainment: "Hiburan",
    shopping: "Belanja",
    income: "Pemasukan",
    health: "Kesehatan",
    education: "Pendidikan",
    gift: "Hadiah/Donasi",
    investment: "Investasi",
    other: "Lainnya",
    transfer: "Pindah Saldo",
  },
};

export type CategoryKey = keyof typeof STR.cat;
