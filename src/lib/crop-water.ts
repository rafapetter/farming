import { CROP_WATER_NEEDS } from "@/lib/constants";

export interface CropWaterStatus {
  cropType: string;
  cropLabel: string;
  accumulatedMm: number;
  minMm: number;
  maxMm: number;
  cycleDays: number;
  daysElapsed: number;
  expectedMmToDate: number;
  status: "deficit" | "adequate" | "excess";
  percentOfIdeal: number;
  peakStage: string;
}

export function computeCropWaterStatus(
  cropType: string,
  plantingDate: string | null,
  harvestDate: string | null,
  accumulatedMm: number,
  today: Date = new Date()
): CropWaterStatus {
  const needs = CROP_WATER_NEEDS[cropType] ?? {
    minMm: 0,
    maxMm: 0,
    cycleDays: 120,
    peakStage: "–",
  };
  const cropLabel =
    cropType === "soy" ? "Soja" : cropType === "corn" ? "Milho" : cropType;

  const startDate = plantingDate
    ? new Date(plantingDate + "T12:00:00")
    : today;
  const endDate = harvestDate
    ? new Date(harvestDate + "T12:00:00")
    : new Date(startDate.getTime() + needs.cycleDays * 86400000);

  const totalCycleDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
  );
  const daysElapsed = Math.max(
    0,
    Math.round((today.getTime() - startDate.getTime()) / 86400000)
  );
  const progress = Math.min(1, daysElapsed / totalCycleDays);

  const expectedMinToDate = needs.minMm * progress;
  const expectedMaxToDate = needs.maxMm * progress;

  let status: "deficit" | "adequate" | "excess";
  if (accumulatedMm < expectedMinToDate * 0.9) {
    status = "deficit";
  } else if (accumulatedMm > expectedMaxToDate * 1.1) {
    status = "excess";
  } else {
    status = "adequate";
  }

  const percentOfIdeal =
    (accumulatedMm / ((needs.minMm + needs.maxMm) / 2)) * 100;

  return {
    cropType,
    cropLabel,
    accumulatedMm,
    minMm: needs.minMm,
    maxMm: needs.maxMm,
    cycleDays: needs.cycleDays,
    daysElapsed,
    expectedMmToDate: (expectedMinToDate + expectedMaxToDate) / 2,
    status,
    percentOfIdeal,
    peakStage: needs.peakStage,
  };
}
