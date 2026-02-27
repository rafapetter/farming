"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { inputs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { inputFormSchema } from "@/lib/validations";

export async function createInput(seasonId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = inputFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const totalPrice =
    data.totalPrice ?? (data.quantity ?? 0) * (data.unitPrice ?? 0);

  await db.insert(inputs).values({
    seasonId,
    name: data.name,
    category: data.category,
    packaging: data.packaging || null,
    unit: data.unit || null,
    quantity: data.quantity?.toString() ?? null,
    unitPrice: data.unitPrice?.toString() ?? null,
    totalPrice: totalPrice.toString(),
    paymentStatus: data.paymentStatus,
    paymentDate: data.paymentDate || null,
    supplier: data.supplier || null,
    notes: data.notes || null,
  });

  revalidatePath(`/safras/${seasonId}/insumos`);
  revalidatePath(`/safras/${seasonId}`);
  return { success: true };
}

export async function updateInputPaymentStatus(
  inputId: string,
  seasonId: string,
  status: "pending" | "paid" | "partial"
) {
  await db
    .update(inputs)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(eq(inputs.id, inputId));

  revalidatePath(`/safras/${seasonId}/insumos`);
  revalidatePath(`/safras/${seasonId}`);
}

export async function deleteInput(inputId: string, seasonId: string) {
  await db.delete(inputs).where(eq(inputs.id, inputId));

  revalidatePath(`/safras/${seasonId}/insumos`);
  revalidatePath(`/safras/${seasonId}`);
}
