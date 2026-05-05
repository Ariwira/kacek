import { createCookieSessionStorage, redirect } from "react-router";
import bcrypt from "bcryptjs";
import { db } from "./db.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === "dev-only-insecure-secret-change-me") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable harus di-set di production.");
  }
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "kacek_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [SESSION_SECRET ?? "dev-only-insecure-secret-change-me"],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export async function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request): Promise<string | null> {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  return typeof userId === "string" ? userId : null;
}

export async function requireUserId(
  request: Request,
  redirectTo = "/login",
): Promise<string> {
  const userId = await getUserId(request);
  if (!userId) throw redirect(redirectTo);
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] ?? null;
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing.length > 0) {
    return { error: "Email sudah terdaftar." };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, passwordHash, name });
  return { userId: id };
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];
  if (!user) return { error: "Email atau password salah." };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Email atau password salah." };
  return { userId: user.id };
}
