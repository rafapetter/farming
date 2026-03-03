import { db } from "@/server/db";
import {
  farms,
  weatherAlertRules,
  weatherAlerts,
  rainCache,
} from "@/server/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

const DEFAULT_LAT = -15.939;
const DEFAULT_LON = -49.814;

interface WeatherForecast {
  dates: string[];
  tempMax: number[];
  tempMin: number[];
  windMax: number[];
  humidityMin: number[];
  precipitationSum: number[];
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

/** Fetch extended weather forecast from Open-Meteo */
export async function fetchWeatherForecast(): Promise<WeatherForecast | null> {
  const { lat, lon, farmId } = await getFarmCoords();

  // Check cache (6hr TTL)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const cached = await db
    .select()
    .from(rainCache)
    .where(
      and(
        eq(rainCache.farmId, farmId),
        eq(rainCache.queryType, "weather_forecast"),
        gte(rainCache.fetchedAt, sixHoursAgo)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return cached[0].responseData as unknown as WeatherForecast;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_min,precipitation_sum&forecast_days=7&timezone=America/Sao_Paulo`;

    const response = await fetch(url, { next: { revalidate: 0 } });
    if (!response.ok) return null;

    const data = await response.json();

    const forecast: WeatherForecast = {
      dates: data.daily.time,
      tempMax: data.daily.temperature_2m_max,
      tempMin: data.daily.temperature_2m_min,
      windMax: data.daily.wind_speed_10m_max,
      humidityMin: data.daily.relative_humidity_2m_min,
      precipitationSum: data.daily.precipitation_sum,
    };

    // Update cache
    await db
      .delete(rainCache)
      .where(
        and(
          eq(rainCache.farmId, farmId),
          eq(rainCache.queryType, "weather_forecast")
        )
      );

    await db.insert(rainCache).values({
      farmId,
      queryType: "weather_forecast",
      startDate: forecast.dates[0] ?? "",
      endDate: forecast.dates[forecast.dates.length - 1] ?? "",
      responseData: forecast as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    });

    return forecast;
  } catch (error) {
    console.error("Weather forecast fetch error:", error);
    return null;
  }
}

const METRIC_LABELS: Record<string, string> = {
  temp_high: "Temperatura alta",
  temp_low: "Temperatura baixa",
  wind: "Vento forte",
  humidity_low: "Umidade baixa",
  frost: "Geada",
  heavy_rain: "Chuva forte",
};

const METRIC_UNITS: Record<string, string> = {
  temp_high: "°C",
  temp_low: "°C",
  wind: "km/h",
  humidity_low: "%",
  frost: "°C",
  heavy_rain: "mm",
};

/** Evaluate weather forecast against alert rules */
export async function evaluateAlertRules(
  farmId: string
): Promise<
  Array<{ metric: string; value: number; message: string; date: string }>
> {
  const rules = await db
    .select()
    .from(weatherAlertRules)
    .where(
      and(
        eq(weatherAlertRules.farmId, farmId),
        eq(weatherAlertRules.enabled, true)
      )
    );

  if (rules.length === 0) return [];

  const forecast = await fetchWeatherForecast();
  if (!forecast) return [];

  const newAlerts: Array<{
    metric: string;
    value: number;
    message: string;
    date: string;
  }> = [];

  for (let i = 0; i < forecast.dates.length; i++) {
    const date = forecast.dates[i];

    for (const rule of rules) {
      let value: number | null = null;
      let triggered = false;

      switch (rule.metric) {
        case "temp_high":
          value = forecast.tempMax[i];
          triggered = value >= parseFloat(rule.threshold);
          break;
        case "temp_low":
          value = forecast.tempMin[i];
          triggered = value <= parseFloat(rule.threshold);
          break;
        case "wind":
          value = forecast.windMax[i];
          triggered = value >= parseFloat(rule.threshold);
          break;
        case "humidity_low":
          value = forecast.humidityMin[i];
          triggered = value <= parseFloat(rule.threshold);
          break;
        case "frost":
          value = forecast.tempMin[i];
          triggered = value <= parseFloat(rule.threshold);
          break;
        case "heavy_rain":
          value = forecast.precipitationSum[i];
          triggered = value >= parseFloat(rule.threshold);
          break;
      }

      if (triggered && value !== null) {
        const label = METRIC_LABELS[rule.metric] ?? rule.metric;
        const unit = METRIC_UNITS[rule.metric] ?? "";
        const dateFormatted = new Date(date + "T12:00:00").toLocaleDateString(
          "pt-BR"
        );

        const message = `${label}: ${value.toFixed(1)}${unit} previsto para ${dateFormatted} (limite: ${rule.threshold}${unit})`;

        // Check if alert already exists for this rule + date
        const existing = await db
          .select({ id: weatherAlerts.id })
          .from(weatherAlerts)
          .where(
            and(
              eq(weatherAlerts.farmId, farmId),
              eq(weatherAlerts.ruleId, rule.id),
              eq(weatherAlerts.date, date)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(weatherAlerts).values({
            farmId,
            ruleId: rule.id,
            metric: rule.metric,
            value: value.toFixed(2),
            message,
            date,
          });

          newAlerts.push({ metric: rule.metric, value, message, date });
        }
      }
    }
  }

  return newAlerts;
}

/** Seed default alert rules for a farm */
export async function seedDefaultAlertRules(
  farmId: string
): Promise<void> {
  const existing = await db
    .select({ id: weatherAlertRules.id })
    .from(weatherAlertRules)
    .where(eq(weatherAlertRules.farmId, farmId))
    .limit(1);

  if (existing.length > 0) return;

  const defaults = [
    { metric: "frost" as const, threshold: "2.00" },
    { metric: "temp_high" as const, threshold: "38.00" },
    { metric: "wind" as const, threshold: "50.00" },
    { metric: "heavy_rain" as const, threshold: "50.00" },
    { metric: "humidity_low" as const, threshold: "20.00" },
  ];

  for (const d of defaults) {
    await db.insert(weatherAlertRules).values({
      farmId,
      metric: d.metric,
      threshold: d.threshold,
      enabled: true,
    });
  }
}

/** Get recent alerts for a farm */
export async function getRecentAlerts(
  farmId: string,
  days: number = 7
): Promise<
  Array<{
    id: string;
    metric: string;
    value: string;
    message: string;
    date: string;
    notifiedAt: Date | null;
  }>
> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().split("T")[0];

  return db
    .select({
      id: weatherAlerts.id,
      metric: weatherAlerts.metric,
      value: weatherAlerts.value,
      message: weatherAlerts.message,
      date: weatherAlerts.date,
      notifiedAt: weatherAlerts.notifiedAt,
    })
    .from(weatherAlerts)
    .where(
      and(
        eq(weatherAlerts.farmId, farmId),
        gte(weatherAlerts.date, cutoffDate)
      )
    )
    .orderBy(desc(weatherAlerts.date));
}
