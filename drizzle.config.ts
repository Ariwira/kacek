import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// Use the `turso` dialect for production (with auth token), but fall back to
// the local-file `sqlite` dialect when no token is set so dev works zero-config.
export default authToken
  ? defineConfig({
      schema: "./app/db/schema.ts",
      out: "./drizzle",
      dialect: "turso",
      dbCredentials: { url, authToken },
    })
  : defineConfig({
      schema: "./app/db/schema.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: { url },
    });
