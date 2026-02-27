"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { services } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { serviceFormSchema } from "@/lib/validations";

export async function createService(seasonId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = serviceFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  let totalCost = data.totalCost ?? 0;
  if (!data.totalCost) {
    if (data.hectares && data.costPerHectare) {
      totalCost = data.hectares * data.costPerHectare;
    } else if (data.hours && data.costPerHour) {
      totalCost = data.hours * data.costPerHour;
    }
  }

  await db.insert(services).values({
    seasonId,
    description: data.description,
    hectares: data.hectares?.toString() ?? null,
    hours: data.hours?.toString() ?? null,
    costPerHectare: data.costPerHectare?.toString() ?? null,
    costPerHour: data.costPerHour?.toString() ?? null,
    totalCost: totalCost.toString(),
    paymentStatus: data.paymentStatus,
    paymentDate: data.paymentDate || null,
    workerName: data.workerName || null,
    notes: data.notes || null,
  });

  revalidatePath(`/safras/${seasonId}/servicos`);
  revalidatePath(`/safras/${seasonId}`);
  return { success: true };
}

export async function updateServicePaymentStatus(
  serviceId: string,
  seasonId: string,
  status: "pending" | "paid" | "partial"
) {
  await db
    .update(services)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(eq(services.id, serviceId));

  revalidatePath(`/safras/${seasonId}/servicos`);
  revalidatePath(`/safras/${seasonId}`);
}

export async function deleteService(serviceId: string, seasonId: string) {
  await db.delete(services).where(eq(services.id, serviceId));

  revalidatePath(`/safras/${seasonId}/servicos`);
  revalidatePath(`/safras/${seasonId}`);
}
