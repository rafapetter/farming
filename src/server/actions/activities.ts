"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { activities } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { activityFormSchema } from "@/lib/validations";

export async function createActivity(seasonId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = activityFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db.insert(activities).values({
    seasonId,
    title: data.title,
    activityType: data.activityType,
    scheduledDate: data.scheduledDate || null,
    completedDate: data.completedDate || null,
    machineId: data.machineId || null,
    hoursUsed: data.hoursUsed?.toString() ?? null,
    quantity: data.quantity || null,
    observations: data.observations || null,
    status: data.status,
  });

  revalidatePath(`/safras/${seasonId}/planejamento`);
  revalidatePath(`/safras/${seasonId}`);
  revalidatePath("/atividades");
  return { success: true };
}

export async function updateActivityStatus(
  activityId: string,
  seasonId: string,
  status: "planned" | "in_progress" | "completed" | "cancelled"
) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "completed") {
    updates.completedDate = new Date().toISOString().split("T")[0];
  }

  await db.update(activities).set(updates).where(eq(activities.id, activityId));

  revalidatePath(`/safras/${seasonId}/planejamento`);
  revalidatePath(`/safras/${seasonId}`);
  revalidatePath("/atividades");
}

export async function updateActivity(
  activityId: string,
  seasonId: string,
  formData: FormData
) {
  const raw = Object.fromEntries(formData);
  const parsed = activityFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db
    .update(activities)
    .set({
      title: data.title,
      activityType: data.activityType,
      scheduledDate: data.scheduledDate || null,
      completedDate: data.completedDate || null,
      machineId: data.machineId || null,
      hoursUsed: data.hoursUsed?.toString() ?? null,
      quantity: data.quantity || null,
      observations: data.observations || null,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, activityId));

  revalidatePath(`/safras/${seasonId}/planejamento`);
  revalidatePath(`/safras/${seasonId}`);
  revalidatePath("/atividades");
  return { success: true };
}

export async function deleteActivity(activityId: string, seasonId: string) {
  await db.delete(activities).where(eq(activities.id, activityId));

  revalidatePath(`/safras/${seasonId}/planejamento`);
  revalidatePath(`/safras/${seasonId}`);
  revalidatePath("/atividades");
}
