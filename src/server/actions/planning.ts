"use server";

import { db } from "@/server/db";
import {
  budgetTargets,
  cropEvaluations,
  farms,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getFarmId(): Promise<string> {
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) throw new Error("Farm not found");
  return farm.id;
}

// ─── Budget Targets ─────────────────────────────────────────────────────────

export async function getBudgetTargets(farmId: string, year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return db
    .select()
    .from(budgetTargets)
    .where(eq(budgetTargets.farmId, farmId));
}

export async function saveBudgetTarget(formData: FormData) {
  const farmId = formData.get("farmId") as string;
  const category = formData.get("category") as string;
  const monthlyLimit = (formData.get("monthlyLimit") as string) || null;
  const yearlyLimit = (formData.get("yearlyLimit") as string) || null;
  const year = parseInt(formData.get("year") as string) || new Date().getFullYear();

  if (!farmId || !category) {
    return { error: "Categoria é obrigatória" };
  }

  // Check if exists for this category + year
  const existing = await db
    .select()
    .from(budgetTargets)
    .where(eq(budgetTargets.farmId, farmId))
    .then((rows) =>
      rows.find((r) => r.category === category && r.year === year)
    );

  if (existing) {
    await db
      .update(budgetTargets)
      .set({ monthlyLimit, yearlyLimit })
      .where(eq(budgetTargets.id, existing.id));
  } else {
    await db.insert(budgetTargets).values({
      farmId,
      category,
      monthlyLimit,
      yearlyLimit,
      year,
    });
  }

  revalidatePath("/planejamento");
  return { success: true };
}

export async function deleteBudgetTarget(targetId: string) {
  await db.delete(budgetTargets).where(eq(budgetTargets.id, targetId));
  revalidatePath("/planejamento");
  return { success: true };
}

// ─── Crop Evaluations ───────────────────────────────────────────────────────

export async function getCropEvaluations(farmId: string) {
  return db
    .select()
    .from(cropEvaluations)
    .where(eq(cropEvaluations.farmId, farmId));
}

export async function saveCropEvaluation(
  farmId: string,
  cropName: string,
  analysisData: Record<string, unknown>,
  estimatedRevenuePerHa?: number,
  estimatedCostPerHa?: number,
  riskScore?: number
) {
  await db.insert(cropEvaluations).values({
    farmId,
    cropName,
    analysisData,
    estimatedRevenuePerHa: estimatedRevenuePerHa?.toFixed(2),
    estimatedCostPerHa: estimatedCostPerHa?.toFixed(2),
    riskScore: riskScore?.toFixed(1),
  });

  revalidatePath("/planejamento");
  return { success: true };
}

export async function deleteCropEvaluation(evalId: string) {
  await db.delete(cropEvaluations).where(eq(cropEvaluations.id, evalId));
  revalidatePath("/planejamento");
  return { success: true };
}
