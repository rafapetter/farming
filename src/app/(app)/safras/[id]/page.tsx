import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, inputs, services, activities } from "@/server/db/schema";
import { eq, sum, count, and } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Wrench,
  CalendarDays,
  BarChart3,
  GitCompare,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import {
  CROP_TYPE_LABELS,
  SEASON_STATUS_LABELS,
} from "@/lib/constants";

export default async function SafraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let season;
  try {
    const [result] = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.id, id))
      .limit(1);
    season = result;
  } catch {
    notFound();
  }

  if (!season) notFound();

  // Fetch summary data
  let inputsTotal = "0";
  let servicesTotal = "0";
  let activitiesCount = 0;
  let pendingActivities = 0;

  try {
    const [inputsSum] = await db
      .select({ total: sum(inputs.totalPrice) })
      .from(inputs)
      .where(eq(inputs.seasonId, id));
    inputsTotal = inputsSum?.total ?? "0";

    const [servicesSum] = await db
      .select({ total: sum(services.totalCost) })
      .from(services)
      .where(eq(services.seasonId, id));
    servicesTotal = servicesSum?.total ?? "0";

    const [actCount] = await db
      .select({ count: count() })
      .from(activities)
      .where(eq(activities.seasonId, id));
    activitiesCount = actCount?.count ?? 0;

    const [pendCount] = await db
      .select({ count: count() })
      .from(activities)
      .where(
        and(eq(activities.seasonId, id), eq(activities.status, "planned"))
      );
    pendingActivities = pendCount?.count ?? 0;
  } catch {
    // DB error - show zeros
  }

  const totalCost =
    parseFloat(inputsTotal || "0") + parseFloat(servicesTotal || "0");

  const subPages = [
    {
      title: "Insumos",
      href: `/safras/${id}/insumos`,
      icon: Package,
      description: "Sementes, fertilizantes, herbicidas",
      value: `R$ ${parseFloat(inputsTotal || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    {
      title: "Serviços",
      href: `/safras/${id}/servicos`,
      icon: Wrench,
      description: "Mão de obra, maquinário",
      value: `R$ ${parseFloat(servicesTotal || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    {
      title: "Planejamento",
      href: `/safras/${id}/planejamento`,
      icon: CalendarDays,
      description: "Cronograma de atividades",
      value: `${activitiesCount} atividades`,
    },
    {
      title: "Previsão",
      href: `/safras/${id}/previsao`,
      icon: BarChart3,
      description: "Estimativa de produtividade",
      value: "Ver previsão",
    },
    {
      title: "Comparativo",
      href: `/safras/${id}/comparativo`,
      icon: GitCompare,
      description: "Comparação entre cultivares",
      value: "Comparar",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={season.status === "active" ? "default" : "secondary"}
          >
            {SEASON_STATUS_LABELS[season.status] ?? season.status}
          </Badge>
          <Badge variant="outline">
            {CROP_TYPE_LABELS[season.cropType] ?? season.cropType}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{season.name}</h1>
        <p className="text-muted-foreground">
          {season.totalAreaHa && `${season.totalAreaHa} hectares`}
          {season.cycleDays && ` | Ciclo: ${season.cycleDays} dias`}
          {season.plantingDate &&
            ` | Plantio: ${new Date(season.plantingDate).toLocaleDateString("pt-BR")}`}
          {season.harvestDate &&
            ` | Colheita: ${new Date(season.harvestDate).toLocaleDateString("pt-BR")}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R${" "}
              {totalCost.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activitiesCount}</p>
            <p className="text-xs text-muted-foreground">
              {pendingActivities} pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {season.totalAreaHa ?? "–"} ha
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-pages Navigation */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <page.icon className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{page.title}</CardTitle>
                <CardDescription className="text-xs">
                  {page.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{page.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
