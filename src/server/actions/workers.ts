"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { workers, workerAssignments, farms } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { workerFormSchema, workerAssignmentFormSchema } from "@/lib/validations";

export async function createWorker(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = workerFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(workers).values({
    farmId: farm.id,
    name: data.name,
    role: data.role,
    phone: data.phone || null,
    dailyRate: data.dailyRate?.toString() ?? null,
    hireDate: data.hireDate || null,
    notes: data.notes || null,
  });

  revalidatePath("/trabalhadores");
  return { success: true };
}

export async function updateWorker(workerId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = workerFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const active = formData.get("active") !== "false";

  await db
    .update(workers)
    .set({
      name: data.name,
      role: data.role,
      phone: data.phone || null,
      dailyRate: data.dailyRate?.toString() ?? null,
      hireDate: data.hireDate || null,
      notes: data.notes || null,
      active,
    })
    .where(eq(workers.id, workerId));

  revalidatePath("/trabalhadores");
  return { success: true };
}

export async function deleteWorker(workerId: string) {
  // Delete assignments first
  await db.delete(workerAssignments).where(eq(workerAssignments.workerId, workerId));
  await db.delete(workers).where(eq(workers.id, workerId));
  revalidatePath("/trabalhadores");
}

export async function createWorkerAssignment(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = workerAssignmentFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db.insert(workerAssignments).values({
    workerId: data.workerId,
    fieldId: data.fieldId || null,
    date: data.date,
    hoursWorked: data.hoursWorked?.toString() ?? null,
    cost: data.cost?.toString() ?? null,
    description: data.description || null,
  });

  revalidatePath("/trabalhadores");
  return { success: true };
}

export async function deleteWorkerAssignment(assignmentId: string) {
  await db.delete(workerAssignments).where(eq(workerAssignments.id, assignmentId));
  revalidatePath("/trabalhadores");
}
