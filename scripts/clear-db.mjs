import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./local.db" });

const tables = [
  "recurring_transactions",
  "notifications",
  "transactions",
  "budgets",
  "goals",
  "categories",
  "accounts",
  "users",
];

for (const table of tables) {
  await client.execute(`DELETE FROM ${table}`);
  const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
  console.log(`✅ ${table}: cleared (remaining: ${result.rows[0].count})`);
}

await client.close();
console.log("\nDone! All dummy data removed. Database is clean for production.");
