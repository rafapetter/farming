import { db } from "@/server/db";
import { cropSeasons, rainEntries, farms } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Droplets, TrendingUp, CloudSun, Trash2 } from "lucide-react";
import { RainFormDialog } from "@/components/forms/rain-form-dialog";
import { RainTimelineChart } from "@/components/charts/rain-timeline-chart";
import { RainMonthlyChart } from "@/components/charts/rain-monthly-chart";
import { CropWaterNeedsChart } from "@/components/charts/crop-water-needs-chart";
import { getMergedRainData, fetchForecastRain } from "@/lib/rain-api";
import { computeCropWaterStatus } from "@/lib/crop-water";
import { DeleteRainButton } from "./delete-button";

export default async function ChuvasPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Use the current rainy season range (Oct - Mar for Goias)
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const seasonStartYear = currentMonth >= 10 ? currentYear : currentYear - 1;
  const seasonStart = `${seasonStartYear}-10-01`;

  let rainData: Array<{
    date: string;
    precipitationMm: number;
    source: "api" | "manual";
  }> = [];
  let forecastData: Array<{
    date: string;
    precipitationMm: number;
    source: "api" | "manual";
  }> = [];
  let manualEntries: Array<{
    id: string;
    date: string;
    volumeMm: string;
    notes: string | null;
    source: string;
  }> = [];
  let seasons: Array<{
    name: string;
    cropType: string;
    plantingDate: string | null;
    harvestDate: string | null;
    totalAreaHa: string | null;
  }> = [];

  try {
    rainData = await getMergedRainData(seasonStart, todayStr);
    forecastData = await fetchForecastRain();

    const [farm] = await db.select().from(farms).limit(1);
    if (farm) {
      manualEntries = await db
        .select()
        .from(rainEntries)
        .where(eq(rainEntries.farmId, farm.id))
        .orderBy(desc(rainEntries.date))
        .limit(50);
    }

    seasons = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.status, "active"));
  } catch {
    // Handle errors gracefully
  }

  // Compute totals
  const totalRainMm = rainData.reduce((s, d) => s + d.precipitationMm, 0);
  const rainyDays = rainData.filter((d) => d.precipitationMm > 0).length;
  const maxDayEntry = rainData.reduce(
    (max, d) => (d.precipitationMm > max.precipitationMm ? d : max),
    { date: "", precipitationMm: 0, source: "api" as const }
  );
  const forecastTotalMm = forecastData.reduce(
    (s, d) => s + d.precipitationMm,
    0
  );

  // Monthly aggregation
  const monthlyMap = new Map<number, number>();
  for (const d of rainData) {
    const month = new Date(d.date + "T12:00:00").getMonth() + 1;
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + d.precipitationMm);
  }
  const monthlyData = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, totalMm]) => ({ month, totalMm }));

  // Crop water needs comparison
  const cropWaterData = seasons.map((season) => {
    const start = season.plantingDate ?? seasonStart;
    const end = season.harvestDate ?? todayStr;
    const cropRain = rainData
      .filter((d) => d.date >= start && d.date <= end)
      .reduce((s, d) => s + d.precipitationMm, 0);

    const status = computeCropWaterStatus(
      season.cropType,
      season.plantingDate,
      season.harvestDate,
      cropRain
    );

    return {
      name: status.cropLabel,
      acumulado: Math.round(cropRain),
      minimo: status.minMm,
      ideal: status.maxMm,
      status: status.status,
      percentOfIdeal: status.percentOfIdeal,
      daysElapsed: status.daysElapsed,
      expectedMmToDate: status.expectedMmToDate,
      peakStage: status.peakStage,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chuvas e Precipitação
          </h1>
          <p className="text-sm text-muted-foreground">
            Dados Open-Meteo + registros manuais
          </p>
        </div>
        <RainFormDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Acumulado na Safra
            </CardTitle>
            <CloudRain className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {totalRainMm.toFixed(0)} mm
            </div>
            <p className="text-xs text-muted-foreground">
              Desde {new Date(seasonStart + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Dias com Chuva
            </CardTitle>
            <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{rainyDays}</div>
            <p className="text-xs text-muted-foreground">
              de {rainData.length} dias no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Maior Registro
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {maxDayEntry.precipitationMm.toFixed(1)} mm
            </div>
            <p className="text-xs text-muted-foreground">
              {maxDayEntry.date
                ? new Date(maxDayEntry.date + "T12:00:00").toLocaleDateString(
                    "pt-BR"
                  )
                : "–"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Previsão 14 dias
            </CardTitle>
            <CloudSun className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {forecastTotalMm.toFixed(0)} mm
            </div>
            <p className="text-xs text-muted-foreground">
              {forecastData.filter((d) => d.precipitationMm > 0).length} dias
              com chuva
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Timeline + Monthly */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precipitação Diária</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <RainTimelineChart data={rainData.slice(-30)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chuva Mensal</CardTitle>
            <CardDescription>Acumulado por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <RainMonthlyChart data={monthlyData} />
          </CardContent>
        </Card>
      </div>

      {/* Crop Water Needs */}
      {cropWaterData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Necessidade Hídrica por Cultura
            </CardTitle>
            <CardDescription>
              Chuva recebida vs necessidade mínima e ideal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CropWaterNeedsChart data={cropWaterData} />
            <div className="flex flex-wrap gap-2">
              {cropWaterData.map((crop) => (
                <Badge
                  key={crop.name}
                  variant={
                    crop.status === "deficit"
                      ? "destructive"
                      : crop.status === "excess"
                        ? "secondary"
                        : "default"
                  }
                >
                  {crop.name}: {crop.acumulado} mm /{" "}
                  {crop.minimo}-{crop.ideal} mm{" "}
                  {crop.status === "deficit"
                    ? "– Déficit hídrico"
                    : crop.status === "excess"
                      ? "– Excesso"
                      : "– Adequado"}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {cropWaterData.map((crop) => (
                <p key={crop.name}>
                  <strong>{crop.name}</strong>: {crop.daysElapsed} dias
                  decorridos, esperado ~{crop.expectedMmToDate.toFixed(0)} mm
                  até hoje. Fase crítica: {crop.peakStage}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 14-day Forecast */}
      {forecastData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previsão de Chuva</CardTitle>
            <CardDescription>Próximos 14 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <RainTimelineChart data={forecastData} />
          </CardContent>
        </Card>
      )}

      {/* Manual Entries Table */}
      {manualEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registros Manuais</CardTitle>
            <CardDescription>
              Suas medições de chuva
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manualEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {parseFloat(entry.volumeMm).toFixed(1)} mm
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          entry.date + "T12:00:00"
                        ).toLocaleDateString("pt-BR")}
                        {entry.notes ? ` – ${entry.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <DeleteRainButton entryId={entry.id} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
