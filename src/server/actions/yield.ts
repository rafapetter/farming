"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { yieldAssessments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const yieldFormSchema = z.object({
  cultivarName: z.string().optional(),
  weight1000GrainsKg: z.coerce.number().min(0).optional(),
  rowSpacingM: z.coerce.number().min(0).optional(),
  plantsPerLinearM: z.coerce.number().min(0).optional(),
  plantPopulationHa: z.coerce.number().int().min(0).optional(),
  pods1Grain: z.coerce.number().int().min(0).optional(),
  pods2Grains: z.coerce.number().int().min(0).optional(),
  pods3Grains: z.coerce.number().int().min(0).optional(),
  pods4Grains: z.coerce.number().int().min(0).optional(),
  pods5Grains: z.coerce.number().int().min(0).optional(),
  avgPodsPerPlant: z.coerce.number().min(0).optional(),
  avgGrainsPerPod: z.coerce.number().min(0).optional(),
  avgGrainsPerPlant: z.coerce.number().int().min(0).optional(),
  grainsPerM2: z.coerce.number().int().min(0).optional(),
  gramsPerPlant: z.coerce.number().min(0).optional(),
  kgPerHa: z.coerce.number().min(0).optional(),
  sacksPerHa: z.coerce.number().min(0).optional(),
  estimatedLossPct: z.coerce.number().min(0).max(100).optional(),
  pricePerSack: z.coerce.number().min(0).optional(),
  productionCostSacks: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function createYieldAssessment(
  seasonId: string,
  formData: FormData
) {
  const raw = Object.fromEntries(formData);
  const parsed = yieldFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;

  await db.insert(yieldAssessments).values({
    seasonId,
    assessmentDate: new Date().toISOString().split("T")[0],
    cultivarName: d.cultivarName || null,
    weight1000GrainsKg: d.weight1000GrainsKg?.toString() ?? null,
    rowSpacingM: d.rowSpacingM?.toString() ?? null,
    plantsPerLinearM: d.plantsPerLinearM?.toString() ?? null,
    plantPopulationHa: d.plantPopulationHa ?? null,
    pods1Grain: d.pods1Grain ?? null,
    pods2Grains: d.pods2Grains ?? null,
    pods3Grains: d.pods3Grains ?? null,
    pods4Grains: d.pods4Grains ?? null,
    pods5Grains: d.pods5Grains ?? null,
    avgPodsPerPlant: d.avgPodsPerPlant?.toString() ?? null,
    avgGrainsPerPod: d.avgGrainsPerPod?.toString() ?? null,
    avgGrainsPerPlant: d.avgGrainsPerPlant ?? null,
    grainsPerM2: d.grainsPerM2 ?? null,
    gramsPerPlant: d.gramsPerPlant?.toString() ?? null,
    kgPerHa: d.kgPerHa?.toString() ?? null,
    sacksPerHa: d.sacksPerHa?.toString() ?? null,
    estimatedLossPct: d.estimatedLossPct?.toString() ?? null,
    pricePerSack: d.pricePerSack?.toString() ?? null,
    productionCostSacks: d.productionCostSacks?.toString() ?? null,
    notes: d.notes || null,
  });

  revalidatePath(`/safras/${seasonId}/previsao`);
  return { success: true };
}

export async function deleteYieldAssessment(
  assessmentId: string,
  seasonId: string
) {
  await db
    .delete(yieldAssessments)
    .where(eq(yieldAssessments.id, assessmentId));
  revalidatePath(`/safras/${seasonId}/previsao`);
}
