import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, yieldAssessments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { YieldFormDialog } from "@/components/forms/yield-form-dialog";

function fmt(value: string | null, decimals = 2) {
  if (!value) return "–";
  return parseFloat(value).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function PrevisaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let season;
  let assessments: Array<(typeof yieldAssessments.$inferSelect)> = [];

  try {
    const [s] = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.id, id))
      .limit(1);
    season = s;

    if (season) {
      assessments = await db
        .select()
        .from(yieldAssessments)
        .where(eq(yieldAssessments.seasonId, id));
    }
  } catch {
    notFound();
  }

  if (!season) notFound();

  const assessment = assessments[0];

  // Computed values
  const totalAreaHa = parseFloat(season.totalAreaHa || "0");
  const sacksPerHa = parseFloat(assessment?.sacksPerHa || "0");
  const pricePerSack = parseFloat(assessment?.pricePerSack || "0");
  const costSacks = parseFloat(assessment?.productionCostSacks || "0");
  const lossPct = parseFloat(assessment?.estimatedLossPct || "0");

  const lossSacksPerHa = sacksPerHa * (lossPct / 100);
  const grossRevenuePerHa = sacksPerHa * pricePerSack;
  const costPerHa = costSacks * pricePerSack;
  const netRevenuePerHa = grossRevenuePerHa - costPerHa;
  const grossRevenueTotal = grossRevenuePerHa * totalAreaHa;
  const netRevenueTotal = netRevenuePerHa * totalAreaHa;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/safras/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Previsão de Produtividade
          </h1>
          <p className="text-sm text-muted-foreground">{season.name}</p>
        </div>
        <YieldFormDialog seasonId={id} />
      </div>

      {!assessment ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma avaliação de produtividade cadastrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Results */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Produtividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(assessment.sacksPerHa)} sc/ha</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(assessment.kgPerHa)} kg/ha
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Perdas Estimadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {fmt(assessment.estimatedLossPct)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt(lossSacksPerHa.toFixed(2))} sc/ha
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Receita Bruta/ha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {fmtCurrency(grossRevenuePerHa)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Resultado Líquido/ha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  {netRevenuePerHa >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <p
                    className={`text-2xl font-bold ${netRevenuePerHa >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {fmtCurrency(netRevenuePerHa)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Area Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Resultado para Área Total ({season.totalAreaHa} ha)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Bruta</p>
                  <p className="text-xl font-bold">
                    {fmtCurrency(grossRevenueTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Resultado Líquido
                  </p>
                  <p
                    className={`text-xl font-bold ${netRevenueTotal >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {fmtCurrency(netRevenueTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plant Data Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da Planta</CardTitle>
              <CardDescription>
                {assessment.cultivarName && `Cultivar: ${assessment.cultivarName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">PMG (kg)</p>
                  <p className="font-medium">{fmt(assessment.weight1000GrainsKg, 4)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Espaçamento (m)</p>
                  <p className="font-medium">{fmt(assessment.rowSpacingM)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Plantas/m linear</p>
                  <p className="font-medium">{fmt(assessment.plantsPerLinearM)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">População/ha</p>
                  <p className="font-medium">
                    {assessment.plantPopulationHa?.toLocaleString("pt-BR") ?? "–"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Média vagens/planta</p>
                  <p className="font-medium">{fmt(assessment.avgPodsPerPlant)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Grãos/m²</p>
                  <p className="font-medium">
                    {assessment.grainsPerM2?.toLocaleString("pt-BR") ?? "–"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Contagem de Vagens</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const key = `pods${n}Grain${n > 1 ? "s" : ""}` as keyof typeof assessment;
                    return (
                      <div key={n} className="rounded-lg border p-2 text-center">
                        <p className="text-xs text-muted-foreground">{n} grão{n > 1 ? "s" : ""}</p>
                        <p className="text-lg font-bold">
                          {(assessment[key] as number | null) ?? 0}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
