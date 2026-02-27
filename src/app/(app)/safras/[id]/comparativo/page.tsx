import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, yieldAssessments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

function fmt(value: string | null | undefined, decimals = 2) {
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

export default async function ComparativoPage({
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

  if (assessments.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/safras/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Comparativo</h1>
            <p className="text-sm text-muted-foreground">{season.name}</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitCompare className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              {assessments.length === 0
                ? "Nenhuma avaliação cadastrada. Adicione avaliações na página de Previsão."
                : "Cadastre pelo menos 2 avaliações de cultivares para comparar."}
            </p>
            <Button asChild variant="outline" className="mt-4" size="sm">
              <Link href={`/safras/${id}/previsao`}>
                Ir para Previsão
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [a, b] = assessments;
  const totalAreaHa = parseFloat(season.totalAreaHa || "0");

  const metrics = [
    {
      label: "Cultivar",
      a: a.cultivarName || "Lote A",
      b: b.cultivarName || "Lote B",
    },
    { label: "kg/ha", a: fmt(a.kgPerHa), b: fmt(b.kgPerHa) },
    { label: "Sacas/ha", a: fmt(a.sacksPerHa), b: fmt(b.sacksPerHa) },
    {
      label: "Perdas (%)",
      a: fmt(a.estimatedLossPct),
      b: fmt(b.estimatedLossPct),
    },
    { label: "População/ha", a: a.plantPopulationHa?.toLocaleString("pt-BR") ?? "–", b: b.plantPopulationHa?.toLocaleString("pt-BR") ?? "–" },
    { label: "Média vagens/planta", a: fmt(a.avgPodsPerPlant), b: fmt(b.avgPodsPerPlant) },
    { label: "Média grãos/vagem", a: fmt(a.avgGrainsPerPod, 4), b: fmt(b.avgGrainsPerPod, 4) },
    { label: "Grãos/m²", a: a.grainsPerM2?.toLocaleString("pt-BR") ?? "–", b: b.grainsPerM2?.toLocaleString("pt-BR") ?? "–" },
    { label: "PMG (kg)", a: fmt(a.weight1000GrainsKg, 4), b: fmt(b.weight1000GrainsKg, 4) },
    { label: "Preço/saca", a: fmt(a.pricePerSack), b: fmt(b.pricePerSack) },
    { label: "Custo (sacas/ha)", a: fmt(a.productionCostSacks), b: fmt(b.productionCostSacks) },
  ];

  const sacksA = parseFloat(a.sacksPerHa || "0");
  const sacksB = parseFloat(b.sacksPerHa || "0");
  const priceA = parseFloat(a.pricePerSack || "0");
  const priceB = parseFloat(b.pricePerSack || "0");
  const costA = parseFloat(a.productionCostSacks || "0");
  const costB = parseFloat(b.productionCostSacks || "0");

  const netA = (sacksA - costA) * priceA;
  const netB = (sacksB - costB) * priceB;
  const diffNet = netA - netB;

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
            Comparativo de Cultivares
          </h1>
          <p className="text-sm text-muted-foreground">{season.name}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {a.cultivarName || "Lote A"} - Resultado Líquido/ha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netA >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(netA)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {b.cultivarName || "Lote B"} - Resultado Líquido/ha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netB >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(netB)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Difference */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          {diffNet >= 0 ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          <p className="text-sm">
            <strong>{a.cultivarName || "Lote A"}</strong> produz{" "}
            <strong>
              {Math.abs(parseFloat(a.kgPerHa || "0") - parseFloat(b.kgPerHa || "0")).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg/ha
            </strong>{" "}
            {parseFloat(a.kgPerHa || "0") >= parseFloat(b.kgPerHa || "0") ? "a mais" : "a menos"} que{" "}
            <strong>{b.cultivarName || "Lote B"}</strong>, representando{" "}
            <strong>{fmtCurrency(Math.abs(diffNet))}/ha</strong> de diferença.
          </p>
        </CardContent>
      </Card>

      {/* Side by side comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação Detalhada</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Métrica
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium">
                    <Badge variant="outline">{a.cultivarName || "Lote A"}</Badge>
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium">
                    <Badge variant="secondary">{b.cultivarName || "Lote B"}</Badge>
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(1).map((m) => (
                  <tr key={m.label} className="border-b last:border-0">
                    <td className="px-4 py-2 text-sm text-muted-foreground">
                      {m.label}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">
                      {m.a}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">
                      {m.b}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2">
                  <td className="px-4 py-2 text-sm font-medium">
                    Resultado Líquido/ha
                  </td>
                  <td className={`px-4 py-2 text-right text-sm font-bold ${netA >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtCurrency(netA)}
                  </td>
                  <td className={`px-4 py-2 text-right text-sm font-bold ${netB >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtCurrency(netB)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-medium">
                    Resultado Total ({season.totalAreaHa} ha)
                  </td>
                  <td className={`px-4 py-2 text-right text-sm font-bold ${netA >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtCurrency(netA * totalAreaHa)}
                  </td>
                  <td className={`px-4 py-2 text-right text-sm font-bold ${netB >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtCurrency(netB * totalAreaHa)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
