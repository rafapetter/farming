"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { advances } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { advanceFormSchema } from "@/lib/validations";

export async function createAdvance(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = advanceFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db.insert(advances).values({
    seasonId: data.seasonId,
    recipient: data.recipient,
    product: data.product || null,
    quantity: data.quantity || null,
    value: data.value ? String(data.value) : null,
    date: data.date || null,
    notes: data.notes || null,
  });

  revalidatePath("/adiantamentos");
  return { success: true };
}

export async function deleteAdvance(advanceId: string) {
  await db.delete(advances).where(eq(advances.id, advanceId));
  revalidatePath("/adiantamentos");
}
