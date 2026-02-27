import Link from "next/link";
import { db } from "@/server/db";
import { cropSeasons, inputs, services } from "@/server/db/schema";
import { eq, sum } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wheat, ArrowRight } from "lucide-react";
import { SeasonFormDialog } from "@/components/forms/season-form-dialog";
import {
  CROP_TYPE_LABELS,
  SEASON_STATUS_LABELS,
} from "@/lib/constants";

export default async function SafrasPage() {
  let seasons: Array<{
    id: string;
    name: string;
    cropType: string;
    status: string;
    totalAreaHa: string | null;
    plantingDate: string | null;
    harvestDate: string | null;
  }> = [];

  try {
    seasons = await db.select().from(cropSeasons).orderBy(cropSeasons.createdAt);
  } catch {
    // DB not connected yet - show empty state
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safras</h1>
          <p className="text-muted-foreground">
            Gerencie suas safras e acompanhe custos
          </p>
        </div>
        <SeasonFormDialog />
      </div>

      {seasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wheat className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma safra cadastrada ainda. Conecte o banco de dados e execute o seed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seasons.map((season) => (
            <Card key={season.id} className="group relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      season.status === "active" ? "default" : "secondary"
                    }
                  >
                    {SEASON_STATUS_LABELS[season.status] ?? season.status}
                  </Badge>
                  <Badge variant="outline">
                    {CROP_TYPE_LABELS[season.cropType] ?? season.cropType}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{season.name}</CardTitle>
                <CardDescription>
                  {season.totalAreaHa
                    ? `${season.totalAreaHa} hectares`
                    : "Área não definida"}
                  {season.plantingDate &&
                    ` | Plantio: ${new Date(season.plantingDate).toLocaleDateString("pt-BR")}`}
                  {season.harvestDate &&
                    ` | Colheita: ${new Date(season.harvestDate).toLocaleDateString("pt-BR")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost" className="w-full justify-between">
                  <Link href={`/safras/${season.id}`}>
                    Ver detalhes
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
