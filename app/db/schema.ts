import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const CATEGORY_ENUM = [
  "food",
  "transport",
  "bills",
  "entertainment",
  "shopping",
  "income",
  "health",
  "education",
  "gift",
  "investment",
  "other",
] as const;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  hideIncome: integer("hide_income", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Kas", "Bank BCA", "Gopay"
  type: text("type", { enum: ["cash", "bank", "ewallet", "other"] }).notNull().default("cash"),
  balance: integer("balance").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .references(() => accounts.id, { onDelete: "set null" }), // Optional for now to support migration
  goalId: text("goal_id")
    .references(() => goals.id, { onDelete: "set null" }), // Link transaction to a goal (e.g. contribution/refund)
  amount: integer("amount").notNull(), // rupiah, no decimals
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  category: text("category").notNull(),
  note: text("note"),
  receiptUrl: text("receipt_url"), // Path to uploaded file
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // Can be enum key or custom category ID
    amount: integer("amount").notNull(), // rupiah, monthly cap
    month: text("month").notNull(), // "YYYY-MM"
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userCatMonthIdx: uniqueIndex("budgets_user_cat_month_idx").on(
      t.userId,
      t.category,
      t.month,
    ),
  }),
);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Key for the icon
  color: text("color").notNull(), // Key for the color
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  deadline: integer("deadline", { mode: "timestamp" }),
  emoji: text("emoji"),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const recurringTransactions = sqliteTable("recurring_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .references(() => accounts.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  category: text("category").notNull(),
  note: text("note"),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }).notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  nextOccurrence: integer("next_occurrence", { mode: "timestamp" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type DbTransaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
