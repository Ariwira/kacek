import { type ActionFunctionArgs, redirect } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { categories } from "~/db/schema";
import { nanoid } from "nanoid";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  
  const name = formData.get("name") as string;
  const icon = formData.get("icon") as string;
  const color = formData.get("color") as string;

  if (!name || !icon || !color) {
    return { error: "Semua field harus diisi" };
  }

  await db.insert(categories).values({
    id: `cat_${nanoid(10)}`,
    userId,
    name,
    icon,
    color,
  });

  return { success: true };
}
