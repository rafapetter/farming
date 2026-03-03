"use server";

import { db } from "@/server/db";
import { weatherAlertRules, weatherAlerts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAlertRules(farmId: string) {
  return db
    .select()
    .from(weatherAlertRules)
    .where(eq(weatherAlertRules.farmId, farmId));
}

export async function updateAlertRule(
  ruleId: string,
  data: { threshold?: string; enabled?: boolean }
) {
  await db
    .update(weatherAlertRules)
    .set(data)
    .where(eq(weatherAlertRules.id, ruleId));
  revalidatePath("/configuracoes");
  return { success: true };
}

export async function createAlertRule(formData: FormData) {
  const farmId = formData.get("farmId") as string;
  const metric = formData.get("metric") as string;
  const threshold = formData.get("threshold") as string;

  if (!farmId || !metric || !threshold) {
    return { error: "Campos obrigatórios faltando" };
  }

  await db.insert(weatherAlertRules).values({
    farmId,
    metric: metric as any,
    threshold,
    enabled: true,
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function deleteAlertRule(ruleId: string) {
  // Delete associated alerts first
  await db
    .delete(weatherAlerts)
    .where(eq(weatherAlerts.ruleId, ruleId));

  await db
    .delete(weatherAlertRules)
    .where(eq(weatherAlertRules.id, ruleId));

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function markAlertNotified(alertId: string) {
  await db
    .update(weatherAlerts)
    .set({ notifiedAt: new Date() })
    .where(eq(weatherAlerts.id, alertId));
}
