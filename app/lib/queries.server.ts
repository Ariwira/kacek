import { and, asc, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { db } from "./db.server";
import {
  budgets as budgetsTable,
  goals as goalsTable,
  users,
  accounts,
  notifications,
  transactions,
  recurringTransactions,
  categories as categoriesTable,
  CATEGORY_ENUM,
} from "~/db/schema";
import type { CategoryBreakdown } from "~/components/dashboard/analytics-and-form";
import type { SummaryData } from "~/components/dashboard/summary-row";
import type { Transaction } from "~/components/tx-row";
import type { CategoryKey } from "~/components/theme";
import { STR } from "~/lib/i18n";
import { formatIDR } from "~/lib/format";

const DEFAULT_BUDGET_TOTAL = 32_000_000;

export const DEFAULT_BUDGET_BY_CAT: Record<
  Exclude<CategoryKey, "income">,
  number
> = {
  food: 5_000_000,
  transport: 2_000_000,
  bills: 4_000_000,
  entertainment: 1_500_000,
  shopping: 2_500_000,
  health: 1_000_000,
  education: 500_000,
  gift: 300_000,
  investment: 2_000_000,
  other: 500_000,
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const startOfDay = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
};

export const formatYYYYMM = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * Ensures a user has at least one account.
 * If not, creates a default "Dompet Utama" and links existing transactions.
 */
export async function ensureUserAccounts(userId: string) {
  const existing = await db.select().from(accounts).where(eq(accounts.userId, userId));
  if (existing.length > 0) return existing;

  // Create default account
  const accountId = crypto.randomUUID();
  await db.insert(accounts).values({
    id: accountId,
    userId,
    name: "Dompet Utama",
    type: "cash",
    balance: 0,
  });

  // Link existing transactions to this account
  await db
    .update(transactions)
    .set({ accountId })
    .where(and(eq(transactions.userId, userId), sql`account_id IS NULL`));
  
  // Link recurring too
  await db
    .update(recurringTransactions)
    .set({ accountId })
    .where(and(eq(recurringTransactions.userId, userId), sql`account_id IS NULL`));

  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

export async function getDashboardData(
  userId: string,
  range: "week" | "month" | "year" = "month",
): Promise<{
  summary: SummaryData;
  breakdown: CategoryBreakdown[];
  totalForRange: number;
  expenseDelta: number;
  recent: Transaction[];
  totalCount: number;
  netThisWeek: number;
  accounts: any[];
}> {
  // Ensure accounts exist first
  // Start all main queries in parallel to reduce round-trips
  const [userAccounts, rows] = await Promise.all([
    ensureUserAccounts(userId),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        category: transactions.category,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        accountId: transactions.accountId,
        receiptUrl: transactions.receiptUrl,
        catName: categoriesTable.name,
        catIcon: categoriesTable.icon,
        catColor: categoriesTable.color,
      })
      .from(transactions)
      .leftJoin(categoriesTable, eq(transactions.category, categoriesTable.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.occurredAt))
  ]);

  const now = new Date();
  const todayStart = startOfDay(0);
  const monthStart = startOfMonth();
  const sevenDayStart = startOfDay(6);

  // Range-specific starts
  let rangeStart: Date;
  let prevRangeStart: Date;
  let prevRangeEnd: Date;

  if (range === "week") {
    rangeStart = startOfDay(6);
    prevRangeStart = startOfDay(13);
    prevRangeEnd = startOfDay(7);
  } else if (range === "year") {
    rangeStart = new Date(now.getFullYear(), 0, 1);
    prevRangeStart = new Date(now.getFullYear() - 1, 0, 1);
    prevRangeEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else {
    // month
    rangeStart = monthStart;
    prevRangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevRangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  let totalExpensesForRange = 0;
  let prevTotalExpenses = 0;
  let totalIncomeThisMonth = 0;
  let totalIncomePrevMonth = 0;
  let receivedToday = 0;
  let last7Total = 0;
  let netThisWeek = 0;
  const last7Days = [0, 0, 0, 0, 0, 0, 0];
  const breakdownMap = new Map<string, { amt: number; name?: string; icon?: string; color?: string }>();
  let lifetimeIncome = 0;
  let lifetimeExpense = 0;

  // Trend logic: Last 12 weeks of income
  const incomeTrend = new Array(12).fill(0);
  const nowMs = now.getTime();
  const weekMs = 1000 * 60 * 60 * 24 * 7;

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  for (const r of rows) {
    const occurred = r.occurredAt as unknown as Date;
    const amt = r.amount;
    const isExpense = r.type === "expense";

    if (r.type === "income") {
      lifetimeIncome += amt;
      if (occurred >= monthStart) totalIncomeThisMonth += amt;
      else if (occurred >= prevMonthStart && occurred <= prevMonthEnd) totalIncomePrevMonth += amt;
      
      if (occurred >= todayStart) receivedToday += amt;
      if (occurred >= sevenDayStart) netThisWeek += amt;

      // Weekly Trend logic
      const weekIdx = 11 - Math.floor((nowMs - occurred.getTime()) / weekMs);
      if (weekIdx >= 0 && weekIdx <= 11) {
        incomeTrend[weekIdx] += amt;
      }
    } else {
      lifetimeExpense += amt;
      
      // Breakdown logic (for the selected range)
      if (occurred >= rangeStart) {
        totalExpensesForRange += amt;
        const existing = breakdownMap.get(r.category);
        breakdownMap.set(r.category, {
          amt: (existing?.amt ?? 0) + amt,
          name: r.catName ?? undefined,
          icon: r.catIcon ?? undefined,
          color: r.catColor ?? undefined,
        });
      } else if (occurred >= prevRangeStart && occurred <= prevRangeEnd) {
        prevTotalExpenses += amt;
      }

      // Summary logic (month/week fixed)
      if (occurred >= sevenDayStart) {
        last7Total += amt;
        netThisWeek -= amt;
        const dayIdx =
          6 -
          Math.floor(
            (todayStart.getTime() -
              new Date(
                occurred.getFullYear(),
                occurred.getMonth(),
                occurred.getDate(),
              ).getTime()) /
              (1000 * 60 * 60 * 24),
          );
        if (dayIdx >= 0 && dayIdx <= 6) last7Days[dayIdx] += amt;
      }
    }
  }

  const balance = lifetimeIncome - lifetimeExpense;
  const expenseDelta = prevTotalExpenses === 0 
    ? 0 
    : ((totalExpensesForRange - prevTotalExpenses) / prevTotalExpenses) * 100;

  const incomeDelta = totalIncomePrevMonth === 0
    ? 0
    : ((totalIncomeThisMonth - totalIncomePrevMonth) / totalIncomePrevMonth) * 100;

  const breakdown: CategoryBreakdown[] = Array.from(breakdownMap.entries())
    .map(([cat, info]) => ({
      cat: cat as CategoryKey,
      amt: info.amt,
      name: info.name,
      icon: info.icon,
      color: info.color,
      pct: totalExpensesForRange === 0 ? 0 : Math.round((info.amt / totalExpensesForRange) * 100),
    }))
    .sort((a, b) => b.amt - a.amt);

  const recent: Transaction[] = rows.slice(0, 8).map((r) => ({
    id: r.id,
    note: r.note ?? "",
    cat: r.category as CategoryKey,
    catName: r.catName ?? undefined,
    catIcon: r.catIcon ?? undefined,
    catColor: r.catColor ?? undefined,
    date: r.occurredAt as unknown as Date,
    amount: r.amount,
    type: r.type as "expense" | "income",
    receiptUrl: r.receiptUrl,
    accountId: r.accountId as string,
  }));

  const currentMonth = formatYYYYMM();
  const userBudgets = await db
    .select()
    .from(budgetsTable)
    .where(and(eq(budgetsTable.userId, userId), eq(budgetsTable.month, currentMonth)));
  const budgetSum = userBudgets.reduce((s, b) => s + b.amount, 0);

  return {
    summary: {
      totalExpenses: rows.filter(r => r.type === 'expense' && (r.occurredAt as unknown as Date) >= monthStart).reduce((s, r) => s + r.amount, 0),
      budget: budgetSum,
      last7Total,
      last7Days,
      expenseDelta,
      balance,
      receivedToday,
      accounts: userAccounts.slice(0, 2).map((a, i) => ({
        name: a.name,
        amount: a.balance,
        color: i === 0 ? "violet" : "accent",
      })),
      income: totalIncomeThisMonth,
      incomeDelta,
      incomeTrend,
    },
    breakdown,
    totalForRange: totalExpensesForRange,
    expenseDelta,
    recent,
    totalCount: rows.length,
    netThisWeek,
    accounts: userAccounts,
  };
}

// ───── Transactions list (filtered) ─────

export type TxFilters = {
  q?: string;
  category?: string; // "all" | CategoryKey
  type?: string; // "all" | "expense" | "income"
  from?: string | null; // YYYY-MM-DD
  to?: string | null;
};

export async function listTransactions(
  userId: string,
  filters: TxFilters,
): Promise<Transaction[]> {
  let query = db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      cat: transactions.category,
      note: transactions.note,
      receiptUrl: transactions.receiptUrl,
      occurredAt: transactions.occurredAt,
      createdAt: transactions.createdAt,
      accountId: transactions.accountId,
      catName: categoriesTable.name,
      catIcon: categoriesTable.icon,
      catColor: categoriesTable.color,
    })
    .from(transactions)
    .leftJoin(categoriesTable, eq(transactions.category, categoriesTable.id))
    .$dynamic();

  const conditions = [eq(transactions.userId, userId)];
  if (filters.category && filters.category !== "all") {
    conditions.push(eq(transactions.category, filters.category as CategoryKey));
  }
  if (filters.type && filters.type !== "all") {
    conditions.push(
      eq(transactions.type, filters.type as "expense" | "income"),
    );
  }
  if (filters.from) {
    const from = new Date(filters.from);
    if (!isNaN(from.getTime())) {
      conditions.push(gte(transactions.occurredAt, from));
    }
  }
  if (filters.to) {
    const to = new Date(filters.to);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(transactions.occurredAt, to));
    }
  }
  if (filters.q && filters.q.trim()) {
    conditions.push(like(transactions.note, `%${filters.q.trim()}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(desc(transactions.occurredAt));

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as "expense" | "income",
    cat: r.cat as CategoryKey,
    catName: r.catName ?? undefined,
    catIcon: r.catIcon ?? undefined,
    catColor: r.catColor ?? undefined,
    note: r.note || "",
    receiptUrl: r.receiptUrl,
    date: r.occurredAt,
    accountId: r.accountId,
  }));
}

export async function getTransaction(userId: string, id: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
  return rows[0] ?? null;
}

export async function getUserStats(userId: string) {
  const [[counts], [user]] = await Promise.all([
    db
      .select({
        totalTx: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
  ]);

  if (!user) throw new Error("User not found");

  return {
    totalTx: Number(counts?.totalTx) || 0,
    joinedAt: user.createdAt,
    name: user.name,
    email: user.email,
  };
}

// ───── Recurring Transactions ─────

export async function listAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
    .orderBy(desc(accounts.createdAt));
}

export async function listArchivedAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, true)))
    .orderBy(desc(accounts.createdAt));
}

export async function createAccount(userId: string, name: string, type: "cash" | "bank" | "ewallet" | "other", initialBalance: number = 0) {
  const id = crypto.randomUUID();
  await db.insert(accounts).values({
    id,
    userId,
    name,
    type,
    balance: initialBalance,
  });
  return id;
}

export async function deleteAccount(userId: string, id: string) {
  // Check if there are transactions linked
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.accountId, id)));

  if (count > 0) {
    // Has transactions, so archive it instead
    return db
      .update(accounts)
      .set({ isArchived: true })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  }

  // No transactions, safe to delete permanently
  return db
    .delete(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
}

export async function reactivateAccount(userId: string, id: string) {
  return db
    .update(accounts)
    .set({ isArchived: false })
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
}

export async function listRecurringTransactions(userId: string) {
  return db
    .select({
      id: recurringTransactions.id,
      userId: recurringTransactions.userId,
      accountId: recurringTransactions.accountId,
      amount: recurringTransactions.amount,
      type: recurringTransactions.type,
      category: recurringTransactions.category,
      note: recurringTransactions.note,
      frequency: recurringTransactions.frequency,
      startDate: recurringTransactions.startDate,
      nextOccurrence: recurringTransactions.nextOccurrence,
      isActive: recurringTransactions.isActive,
      createdAt: recurringTransactions.createdAt,
      catName: categoriesTable.name,
      catIcon: categoriesTable.icon,
      catColor: categoriesTable.color,
    })
    .from(recurringTransactions)
    .leftJoin(categoriesTable, eq(recurringTransactions.category, categoriesTable.id))
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)))
    .orderBy(desc(recurringTransactions.createdAt));
}

export async function processRecurringTransactions(userId: string) {
  const now = new Date();
  const rts = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
        lte(recurringTransactions.nextOccurrence, now)
      )
    );

  for (const rt of rts) {
    // 1. Insert actual transaction record
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: rt.userId,
      amount: rt.amount,
      type: rt.type,
      category: rt.category,
      note: rt.note,
      occurredAt: rt.nextOccurrence,
    });

    // Create notification
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId,
      title: "Transaksi rutin dicatat",
      message: `Transaksi "${rt.note || STR.cat[rt.category as CategoryKey]}" sebesar ${formatIDR(rt.amount)} telah otomatis dicatat.`,
    });

    // Update Account Balance
    if (rt.accountId) {
      const balanceChange = rt.type === "income" ? rt.amount : -rt.amount;
      await db
        .update(accounts)
        .set({ 
          balance: sql`${accounts.balance} + ${balanceChange}`
        })
        .where(and(eq(accounts.userId, userId), eq(accounts.id, rt.accountId)));
    }

    // 2. Calculate next occurrence
    let next = new Date(rt.nextOccurrence);
    while (next <= now) {
      const d = new Date(next);
      if (rt.frequency === "daily") d.setDate(d.getDate() + 1);
      else if (rt.frequency === "weekly") d.setDate(d.getDate() + 7);
      else if (rt.frequency === "monthly") d.setMonth(d.getMonth() + 1);
      else if (rt.frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
      next = d;
    }

    // Update the recurring record with the new nextOccurrence
    await db
      .update(recurringTransactions)
      .set({ nextOccurrence: next })
      .where(eq(recurringTransactions.id, rt.id));
  }
}

export async function getBudgetView(userId: string, month: string) {
  // 1. Get all budgets for this month
  const [userBudgets, userCategories] = await Promise.all([
    db
      .select()
      .from(budgetsTable)
      .where(and(eq(budgetsTable.userId, userId), eq(budgetsTable.month, month))),
    db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
  ]);

  const budgetMap = new Map(userBudgets.map((b) => [b.category, b.amount]));

  // 2. Get spent amounts for this month
  const start = new Date(month + "-01");
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const spentRows = await db
    .select({
      category: transactions.category,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, start),
        lte(transactions.occurredAt, end),
      ),
    )
    .groupBy(transactions.category);

  const spentMap = new Map(spentRows.map((r) => [r.category, Number(r.total)]));

  // 3. Combine into items
  const ACTIVE_DEFAULT_CATS: CategoryKey[] = ["food", "transport", "bills", "shopping"];
  
  const defaultCats = ACTIVE_DEFAULT_CATS.map((cat) => ({
    category: cat,
    name: undefined as string | undefined,
    icon: undefined as string | undefined,
    color: undefined as string | undefined,
  }));

  const customCats = userCategories.map((c) => ({
    category: c.id as CategoryKey,
    name: c.name,
    icon: c.icon,
    color: c.color,
  }));

  const allCategories = [...defaultCats, ...customCats];

  const items = allCategories.map((catInfo) => {
    const cat = catInfo.category;
    const budget = budgetMap.get(cat) ?? 0;
    const spent = spentMap.get(cat) ?? 0;
    return {
      category: cat,
      name: catInfo.name,
      icon: catInfo.icon,
      color: catInfo.color,
      budget,
      spent,
      pct: budget === 0 ? 0 : Math.round((spent / budget) * 100),
    };
  });

  const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);

  return { items, totalBudget, totalSpent };
}

export async function listNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function markNotificationAsRead(userId: string, id: string) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}

export async function listGoals(userId: string) {
  return db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, userId))
    .orderBy(
      asc(goalsTable.isCompleted),
      asc(goalsTable.deadline),
      desc(goalsTable.createdAt)
    );
}
