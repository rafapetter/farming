"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { machines, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { machineFormSchema } from "@/lib/validations";

export async function createMachine(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = machineFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(machines).values({
    farmId: farm.id,
    name: data.name,
    type: data.type,
    ownership: data.ownership,
    hourlyRate: data.hourlyRate?.toString() ?? null,
    fuelConsumptionLH: data.fuelConsumptionLH?.toString() ?? null,
    fuelPricePerL: data.fuelPricePerL?.toString() ?? null,
    maintenanceCostPerH: data.maintenanceCostPerH?.toString() ?? null,
    notes: data.notes || null,
  });

  revalidatePath("/maquinas");
  return { success: true };
}

export async function updateMachine(machineId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = machineFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db
    .update(machines)
    .set({
      name: data.name,
      type: data.type,
      ownership: data.ownership,
      hourlyRate: data.hourlyRate?.toString() ?? null,
      fuelConsumptionLH: data.fuelConsumptionLH?.toString() ?? null,
      fuelPricePerL: data.fuelPricePerL?.toString() ?? null,
      maintenanceCostPerH: data.maintenanceCostPerH?.toString() ?? null,
      notes: data.notes || null,
    })
    .where(eq(machines.id, machineId));

  revalidatePath("/maquinas");
  return { success: true };
}

export async function deleteMachine(machineId: string) {
  await db.delete(machines).where(eq(machines.id, machineId));
  revalidatePath("/maquinas");
}

/** Estimate machine cost for a given operation */
export async function estimateMachineCost(
  machineId: string,
  areaHa: number,
  activityType: string
): Promise<{
  estimatedHours: number;
  fuelCost: number;
  maintenanceCost: number;
  hourlyRate: number;
  totalEstimate: number;
}> {
  const [machine] = await db
    .select()
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);

  if (!machine) throw new Error("Máquina não encontrada");

  // Typical hours/ha by operation type (reference values for Brazilian farming)
  const hoursPerHa: Record<string, number> = {
    soil_prep: 1.5,     // Preparo de solo
    planting: 0.8,      // Plantio
    spraying: 0.3,      // Pulverização
    fertilizing: 0.5,   // Adubação
    harvest: 0.6,       // Colheita
    other: 1.0,
  };

  const hPerHa = hoursPerHa[activityType] ?? 1.0;
  const estimatedHours = hPerHa * areaHa;

  const fuelLH = parseFloat(machine.fuelConsumptionLH ?? "0");
  const fuelPrice = parseFloat(machine.fuelPricePerL ?? "0");
  const maintPerH = parseFloat(machine.maintenanceCostPerH ?? "0");
  const hourlyRate = parseFloat(machine.hourlyRate ?? "0");

  const fuelCost = estimatedHours * fuelLH * fuelPrice;
  const maintenanceCost = estimatedHours * maintPerH;
  const totalEstimate =
    estimatedHours * hourlyRate + fuelCost + maintenanceCost;

  return {
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    fuelCost: Math.round(fuelCost * 100) / 100,
    maintenanceCost: Math.round(maintenanceCost * 100) / 100,
    hourlyRate,
    totalEstimate: Math.round(totalEstimate * 100) / 100,
  };
}
