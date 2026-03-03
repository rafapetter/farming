import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import {
  cropSeasons,
  inputs,
  services,
  activities,
  machines,
} from "@/server/db/schema";
import { eq, sum, count, and } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Wrench,
  CalendarDays,
  BarChart3,
  GitCompare,
  ArrowRight,
  Tractor,
} from "lucide-react";
import {
  CROP_TYPE_LABELS,
  SEASON_STATUS_LABELS,
  MACHINE_TYPE_LABELS,
  MACHINE_OWNERSHIP_LABELS,
  ACTIVITY_TYPE_LABELS,
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
  let machineUsage: Array<{
    machineName: string;
    machineType: string;
    ownership: string;
    source: "service" | "activity";
    description: string;
    hours: number;
    cost: number;
  }> = [];

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

    // Fetch machine usage from services
    const serviceUsage = await db
      .select({
        machineName: machines.name,
        machineType: machines.type,
        ownership: machines.ownership,
        description: services.description,
        hours: services.hours,
        totalCost: services.totalCost,
      })
      .from(services)
      .innerJoin(machines, eq(services.machineId, machines.id))
      .where(eq(services.seasonId, id));

    for (const s of serviceUsage) {
      machineUsage.push({
        machineName: s.machineName,
        machineType: s.machineType,
        ownership: s.ownership,
        source: "service",
        description: s.description,
        hours: parseFloat(s.hours ?? "0"),
        cost: parseFloat(s.totalCost ?? "0"),
      });
    }

    // Fetch machine usage from activities
    const activityUsage = await db
      .select({
        machineName: machines.name,
        machineType: machines.type,
        ownership: machines.ownership,
        title: activities.title,
        activityType: activities.activityType,
        hoursUsed: activities.hoursUsed,
      })
      .from(activities)
      .innerJoin(machines, eq(activities.machineId, machines.id))
      .where(eq(activities.seasonId, id));

    for (const a of activityUsage) {
      machineUsage.push({
        machineName: a.machineName,
        machineType: a.machineType,
        ownership: a.ownership,
        source: "activity",
        description: `${ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}: ${a.title}`,
        hours: parseFloat(a.hoursUsed ?? "0"),
        cost: 0,
      });
    }
  } catch {
    // DB error - show zeros
  }

  const totalCost =
    parseFloat(inputsTotal || "0") + parseFloat(servicesTotal || "0");

  // Aggregate machine usage by machine name
  const machineAgg = new Map<
    string,
    { type: string; ownership: string; totalHours: number; totalCost: number; count: number }
  >();
  for (const u of machineUsage) {
    const existing = machineAgg.get(u.machineName);
    if (existing) {
      existing.totalHours += u.hours;
      existing.totalCost += u.cost;
      existing.count += 1;
    } else {
      machineAgg.set(u.machineName, {
        type: u.machineType,
        ownership: u.ownership,
        totalHours: u.hours,
        totalCost: u.cost,
        count: 1,
      });
    }
  }

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

      {/* Machine Usage */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Tractor className="h-4 w-4" />
          Máquinas Utilizadas nesta Safra
        </h2>
        {machineAgg.size > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(machineAgg.entries()).map(([name, data]) => (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{name}</p>
                    <Badge variant="outline" className="text-xs">
                      {MACHINE_OWNERSHIP_LABELS[data.ownership] ??
                        data.ownership}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {MACHINE_TYPE_LABELS[data.type] ?? data.type}
                  </p>
                  <div className="flex gap-4 text-xs">
                    <span>
                      <span className="font-medium">{data.count}</span>{" "}
                      {data.count === 1 ? "uso" : "usos"}
                    </span>
                    {data.totalHours > 0 && (
                      <span>
                        <span className="font-medium">
                          {data.totalHours.toFixed(1)}
                        </span>
                        h
                      </span>
                    )}
                    {data.totalCost > 0 && (
                      <span className="text-primary font-medium">
                        R${" "}
                        {data.totalCost.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Tractor className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma máquina vinculada a esta safra ainda.
                Vincule máquinas em Serviços ou Planejamento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
