"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function updateFarm(
  farmId: string,
  data: {
    name?: string;
    location?: string;
    latitude?: string;
    longitude?: string;
    totalAreaHa?: string;
  }
) {
  await db
    .update(farms)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
      ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
      ...(data.totalAreaHa !== undefined
        ? { totalAreaHa: data.totalAreaHa }
        : {}),
    })
    .where(eq(farms.id, farmId));

  revalidatePath("/configuracoes");
  revalidatePath("/talhoes");
  return { success: true };
}

/** Geocode an address using OpenStreetMap Nominatim */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "FazendaDigital/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (!results || results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lon: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch {
    return null;
  }
}
