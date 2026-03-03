import { db } from "@/server/db";
import { fields, farms } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, MapPin, CloudRain, CloudSun } from "lucide-react";
import { FieldFormDialog } from "@/components/forms/field-form-dialog";
import { FieldEditDialog } from "@/components/forms/field-edit-dialog";
import { FarmMap } from "@/components/farm-map";
import { getMergedRainData, fetchForecastRain } from "@/lib/rain-api";

export default async function TalhoesPage() {
  let fieldsList: Array<{
    id: string;
    name: string;
    areaHa: string | null;
    notes: string | null;
    coordinates: unknown;
  }> = [];

  let farmLocation: { latitude: number; longitude: number } | null = null;

  // Rain data
  let rain7d = 0;
  let lastRainDate: string | null = null;
  let lastRainMm = 0;
  let forecastTotal = 0;
  let forecastRainyDays = 0;

  try {
    fieldsList = await db.select().from(fields).orderBy(fields.name);

    const [farm] = await db.select().from(farms).limit(1);
    if (farm?.latitude && farm?.longitude) {
      farmLocation = {
        latitude: parseFloat(farm.latitude),
        longitude: parseFloat(farm.longitude),
      };
    }

    // Fetch rain data for the farm location
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [rainData, forecastData] = await Promise.all([
      getMergedRainData(sevenDaysAgo, todayStr).catch(() => []),
      fetchForecastRain().catch(() => []),
    ]);

    rain7d = rainData.reduce((s, d) => s + d.precipitationMm, 0);
    forecastTotal = forecastData.reduce((s, d) => s + d.precipitationMm, 0);
    forecastRainyDays = forecastData.filter((d) => d.precipitationMm > 0).length;

    // Find last day with rain
    const allRain = [...rainData].reverse();
    const lastRain = allRain.find((d) => d.precipitationMm > 0);
    if (lastRain) {
      lastRainDate = lastRain.date;
      lastRainMm = lastRain.precipitationMm;
    }
  } catch {
    // DB not connected
  }

  const totalArea = fieldsList.reduce(
    (s, f) => s + parseFloat(f.areaHa || "0"),
    0
  );
  const withoutArea = fieldsList.filter((f) => !f.areaHa);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Talhões</h1>
          <p className="text-muted-foreground">
            Áreas de plantio da fazenda
          </p>
        </div>
        <FieldFormDialog />
      </div>

      {fieldsList.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {fieldsList.length} talhões
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ha total
          </Badge>
          {withoutArea.length > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {withoutArea.length} sem área definida
            </Badge>
          )}
        </div>
      )}

      {/* Rain summary card */}
      {fieldsList.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Últimos 7 dias:</span>
                <span className="font-medium">{rain7d.toFixed(1)} mm</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Previsão 14d:</span>
                <span className="font-medium">
                  {forecastTotal.toFixed(0)} mm ({forecastRainyDays} dias)
                </span>
              </div>
              {lastRainDate && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Última chuva:</span>
                  <span className="font-medium">
                    {new Date(lastRainDate + "T12:00:00").toLocaleDateString("pt-BR")}
                    {" "}({lastRainMm.toFixed(1)} mm)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {farmLocation && fieldsList.length > 0 && (
        <FarmMap
          latitude={farmLocation.latitude}
          longitude={farmLocation.longitude}
          fields={fieldsList}
        />
      )}

      {fieldsList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Map className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum talhão cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldsList.map((field) => (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{field.name}</CardTitle>
                  </div>
                  <FieldEditDialog field={field} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-sm ${field.areaHa ? "font-medium" : "text-muted-foreground italic"}`}>
                  {field.areaHa
                    ? `${field.areaHa} hectares`
                    : "Clique no lápis para definir a área"}
                </p>
                {field.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {field.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
