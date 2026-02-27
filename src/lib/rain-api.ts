import { db } from "@/server/db";
import { farms, rainCache, rainEntries } from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const DEFAULT_LAT = -15.939;
const DEFAULT_LON = -49.814;

export interface DailyRainData {
  date: string;
  precipitationMm: number;
  source: "api" | "manual";
}

interface OpenMeteoResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
  };
}

async function getFarmCoords(): Promise<{
  lat: number;
  lon: number;
  farmId: string;
}> {
  const [farm] = await db
    .select({
      id: farms.id,
      latitude: farms.latitude,
      longitude: farms.longitude,
    })
    .from(farms)
    .limit(1);
  if (!farm) throw new Error("Farm not found");
  return {
    lat: farm.latitude ? parseFloat(farm.latitude) : DEFAULT_LAT,
    lon: farm.longitude ? parseFloat(farm.longitude) : DEFAULT_LON,
    farmId: farm.id,
  };
}

export async function fetchHistoricalRain(
  startDate: string,
  endDate: string
): Promise<DailyRainData[]> {
  const { lat, lon, farmId } = await getFarmCoords();

  // Check cache
  const cached = await db
    .select()
    .from(rainCache)
    .where(
      and(
        eq(rainCache.farmId, farmId),
        eq(rainCache.queryType, "historical"),
        eq(rainCache.startDate, startDate),
        eq(rainCache.endDate, endDate)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return cached[0].responseData as DailyRainData[];
  }

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=America/Sao_Paulo`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Open-Meteo API error");

  const data: OpenMeteoResponse = await response.json();

  const result: DailyRainData[] = data.daily.time.map((date, i) => ({
    date,
    precipitationMm: data.daily.precipitation_sum[i] ?? 0,
    source: "api" as const,
  }));

  // Cache the result
  await db.insert(rainCache).values({
    farmId,
    queryType: "historical",
    startDate,
    endDate,
    responseData: result as unknown as Record<string, unknown>,
    fetchedAt: new Date(),
  });

  return result;
}

export async function fetchForecastRain(): Promise<DailyRainData[]> {
  const { lat, lon, farmId } = await getFarmCoords();

  // Check cache (max 6 hours old)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const cached = await db
    .select()
    .from(rainCache)
    .where(
      and(
        eq(rainCache.farmId, farmId),
        eq(rainCache.queryType, "forecast"),
        gte(rainCache.fetchedAt, sixHoursAgo)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return cached[0].responseData as DailyRainData[];
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max&forecast_days=14&timezone=America/Sao_Paulo`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Open-Meteo forecast error");

  const data: OpenMeteoResponse = await response.json();

  const result: DailyRainData[] = data.daily.time.map((date, i) => ({
    date,
    precipitationMm: data.daily.precipitation_sum[i] ?? 0,
    source: "api" as const,
  }));

  // Delete old forecast cache, insert new
  await db
    .delete(rainCache)
    .where(
      and(eq(rainCache.farmId, farmId), eq(rainCache.queryType, "forecast"))
    );

  await db.insert(rainCache).values({
    farmId,
    queryType: "forecast",
    startDate: result[0]?.date ?? "",
    endDate: result[result.length - 1]?.date ?? "",
    responseData: result as unknown as Record<string, unknown>,
    fetchedAt: new Date(),
  });

  return result;
}

export async function getManualRainEntries(
  startDate: string,
  endDate: string
): Promise<DailyRainData[]> {
  const { farmId } = await getFarmCoords();

  const entries = await db
    .select()
    .from(rainEntries)
    .where(
      and(
        eq(rainEntries.farmId, farmId),
        gte(rainEntries.date, startDate),
        lte(rainEntries.date, endDate)
      )
    );

  return entries.map((e) => ({
    date: e.date,
    precipitationMm: parseFloat(e.volumeMm),
    source: "manual" as const,
  }));
}

/** Merge API + manual data. Manual entries take precedence on the same date. */
export async function getMergedRainData(
  startDate: string,
  endDate: string
): Promise<DailyRainData[]> {
  const [apiData, manualData] = await Promise.all([
    fetchHistoricalRain(startDate, endDate).catch(
      () => [] as DailyRainData[]
    ),
    getManualRainEntries(startDate, endDate),
  ]);

  const manualByDate = new Map(manualData.map((d) => [d.date, d]));
  const merged: DailyRainData[] = [];

  for (const apiEntry of apiData) {
    const manual = manualByDate.get(apiEntry.date);
    if (manual) {
      merged.push(manual);
      manualByDate.delete(apiEntry.date);
    } else {
      merged.push(apiEntry);
    }
  }

  // Add manual entries that have no matching API date
  for (const remaining of manualByDate.values()) {
    merged.push(remaining);
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}
