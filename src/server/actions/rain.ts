"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { rainEntries, farms } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { rainEntryFormSchema } from "@/lib/validations";

export async function createRainEntry(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = rainEntryFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(rainEntries).values({
    farmId: farm.id,
    date: data.date,
    volumeMm: data.volumeMm.toString(),
    source: "manual",
    notes: data.notes || null,
  });

  revalidatePath("/chuvas");
  revalidatePath("/");
  return { success: true };
}

export async function listRainEntries() {
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return [];

  return db
    .select()
    .from(rainEntries)
    .where(eq(rainEntries.farmId, farm.id))
    .orderBy(desc(rainEntries.date))
    .limit(50);
}

export async function deleteRainEntry(entryId: string) {
  await db.delete(rainEntries).where(eq(rainEntries.id, entryId));
  revalidatePath("/chuvas");
  revalidatePath("/");
  return { success: true };
}
