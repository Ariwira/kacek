import { db } from "./db.server";
import { accounts, transactions } from "../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

async function resync() {
  console.log("Resyncing account balances...");
  
  // Get all accounts
  const allAccounts = await db.select().from(accounts);
  
  for (const account of allAccounts) {
    // Get all transactions for this account OR transactions with no account (to be linked)
    const txs = await db.select().from(transactions).where(
      and(
        eq(transactions.userId, account.userId),
        // include if it belongs to this account, OR if it's the primary account and tx has no account (fallback)
        sql`${transactions.accountId} = ${account.id} OR ${transactions.accountId} IS NULL`
      )
    );
    
    let balance = 0;
    for (const tx of txs) {
      if (tx.type === "income") {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
      
      // Ensure transaction is linked to this account if it's the primary one
      if (!tx.accountId) {
        await db.update(transactions).set({ accountId: account.id }).where(eq(transactions.id, tx.id));
      }
    }
    
    console.log(`Account ${account.name} (${account.id}): Setting balance to ${balance}`);
    await db.update(accounts).set({ balance }).where(eq(accounts.id, account.id));
  }
  
  console.log("Done!");
  process.exit(0);
}

resync().catch(err => {
  console.error(err);
  process.exit(1);
});
