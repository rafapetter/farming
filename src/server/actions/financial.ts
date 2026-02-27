"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { financialEntries, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { financialEntryFormSchema } from "@/lib/validations";

export async function createFinancialEntry(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = financialEntryFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const dateObj = new Date(data.date);

  // Get farm ID (we only have one farm)
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(financialEntries).values({
    farmId: farm.id,
    type: data.type,
    category: data.category,
    description: data.description || null,
    amount: data.amount.toString(),
    date: data.date,
    month: dateObj.getMonth() + 1,
    year: dateObj.getFullYear(),
    notes: data.notes || null,
  });

  revalidatePath("/financeiro");
  return { success: true };
}

export async function deleteFinancialEntry(entryId: string) {
  await db.delete(financialEntries).where(eq(financialEntries.id, entryId));
  revalidatePath("/financeiro");
}
