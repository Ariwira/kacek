import { redirect } from "react-router";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/action.goal";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { goals } from "~/db/schema";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi.").max(80),
  targetAmount: z.coerce.number().int().positive("Target harus lebih dari 0."),
  deadline: z.string().optional(),
  emoji: z.string().max(8).optional(),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const parsed = schema.safeParse({
    id: form.get("id") || undefined,
    name: form.get("name"),
    targetAmount: form.get("targetAmount"),
    deadline: form.get("deadline") || undefined,
    emoji: form.get("emoji") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const data = {
    name: parsed.data.name.trim(),
    targetAmount: parsed.data.targetAmount,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    emoji: parsed.data.emoji?.trim() || null,
  };
  if (parsed.data.id) {
    await db
      .update(goals)
      .set(data)
      .where(and(eq(goals.id, parsed.data.id), eq(goals.userId, userId)));
  } else {
    await db.insert(goals).values({
      id: crypto.randomUUID(),
      userId,
      currentAmount: 0,
      ...data,
    });
  }
  return redirect("/tujuan");
}

export function loader() {
  return redirect("/tujuan");
}
