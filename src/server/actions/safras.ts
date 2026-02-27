"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { cropSeasons, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { cropSeasonFormSchema } from "@/lib/validations";

export async function createCropSeason(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = cropSeasonFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(cropSeasons).values({
    farmId: farm.id,
    name: data.name,
    cropType: data.cropType,
    cycleDays: data.cycleDays ?? null,
    plantingDate: data.plantingDate || null,
    harvestDate: data.harvestDate || null,
    totalAreaHa: data.totalAreaHa?.toString() ?? null,
    status: data.status,
  });

  revalidatePath("/safras");
  return { success: true };
}

export async function updateSeasonStatus(
  seasonId: string,
  status: "planning" | "active" | "harvested" | "closed"
) {
  await db
    .update(cropSeasons)
    .set({ status, updatedAt: new Date() })
    .where(eq(cropSeasons.id, seasonId));

  revalidatePath("/safras");
  revalidatePath(`/safras/${seasonId}`);
}

export async function deleteCropSeason(seasonId: string) {
  await db.delete(cropSeasons).where(eq(cropSeasons.id, seasonId));
  revalidatePath("/safras");
}
