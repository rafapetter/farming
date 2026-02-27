"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { fields, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { fieldFormSchema } from "@/lib/validations";

export async function createField(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = fieldFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(fields).values({
    farmId: farm.id,
    name: data.name,
    areaHa: data.areaHa?.toString() ?? null,
    notes: data.notes || null,
  });

  revalidatePath("/talhoes");
  return { success: true };
}

export async function updateField(fieldId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = fieldFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db
    .update(fields)
    .set({
      name: data.name,
      areaHa: data.areaHa?.toString() ?? null,
      notes: data.notes || null,
    })
    .where(eq(fields.id, fieldId));

  revalidatePath("/talhoes");
  return { success: true };
}

export async function deleteField(fieldId: string) {
  await db.delete(fields).where(eq(fields.id, fieldId));
  revalidatePath("/talhoes");
}
