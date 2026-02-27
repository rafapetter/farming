import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  cropSeasons,
  inputs,
  services,
  activities,
  financialEntries,
} from "@/server/db/schema";
import { eq, sum, count, and, gte } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wheat,
  DollarSign,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CostBreakdownChart } from "@/components/charts/cost-breakdown-chart";
import { MonthlyExpensesChart } from "@/components/charts/monthly-expenses-chart";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  let seasons: Array<{
    id: string;
    name: string;
    cropType: string;
    status: string;
    totalAreaHa: string | null;
  }> = [];
  let totalInputsCost = 0;
  let totalServicesCost = 0;
  let pendingInputs = 0;
  let pendingServices = 0;
  let upcomingActivities: Array<{
    id: string;
    title: string;
    scheduledDate: string | null;
    status: string;
    seasonId: string;
  }> = [];
  let recentActivities: Array<{
    id: string;
    title: string;
    activityType: string;
    scheduledDate: string | null;
    quantity: string | null;
    seasonId: string;
  }> = [];
  let costChartData: Array<{ name: string; insumos: number; servicos: number }> = [];
  let monthlyExpensesData: Array<{ month: number; total: number }> = [];

  try {
    seasons = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.status, "active"));

    for (const season of seasons) {
      const [inputsSum] = await db
        .select({ total: sum(inputs.totalPrice) })
        .from(inputs)
        .where(eq(inputs.seasonId, season.id));
      totalInputsCost += parseFloat(inputsSum?.total ?? "0");

      const [servicesSum] = await db
        .select({ total: sum(services.totalCost) })
        .from(services)
        .where(eq(services.seasonId, season.id));
      totalServicesCost += parseFloat(servicesSum?.total ?? "0");

      const [pendInput] = await db
        .select({ total: sum(inputs.totalPrice) })
        .from(inputs)
        .where(
          and(
            eq(inputs.seasonId, season.id),
            eq(inputs.paymentStatus, "pending")
          )
        );
      pendingInputs += parseFloat(pendInput?.total ?? "0");

      const [pendService] = await db
        .select({ total: sum(services.totalCost) })
        .from(services)
        .where(
          and(
            eq(services.seasonId, season.id),
            eq(services.paymentStatus, "pending")
          )
        );
      pendingServices += parseFloat(pendService?.total ?? "0");
    }

    const today = new Date().toISOString().split("T")[0];
    upcomingActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.status, "planned"),
          gte(activities.scheduledDate, today)
        )
      )
      .orderBy(activities.scheduledDate)
      .limit(5);

    recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.status, "completed"))
      .orderBy(activities.completedDate)
      .limit(4);

    // Chart data: cost breakdown per season
    for (const season of seasons) {
      const cropLabel =
        season.cropType === "soy"
          ? "Soja"
          : season.cropType === "corn"
            ? "Milho"
            : season.cropType;
      const [iSum] = await db
        .select({ total: sum(inputs.totalPrice) })
        .from(inputs)
        .where(eq(inputs.seasonId, season.id));
      const [sSum] = await db
        .select({ total: sum(services.totalCost) })
        .from(services)
        .where(eq(services.seasonId, season.id));
      costChartData.push({
        name: cropLabel,
        insumos: parseFloat(iSum?.total ?? "0"),
        servicos: parseFloat(sSum?.total ?? "0"),
      });
    }

    // Chart data: monthly financial expenses
    const allFinancial = await db
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.year, 2026));
    const byMonth = new Map<number, number>();
    for (const entry of allFinancial) {
      const m = entry.month ?? 1;
      byMonth.set(m, (byMonth.get(m) ?? 0) + parseFloat(entry.amount));
    }
    monthlyExpensesData = Array.from(byMonth.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, total]) => ({ month, total }));
  } catch {
    // DB not connected
  }

  const totalCosts = totalInputsCost + totalServicesCost;
  const totalPending = pendingInputs + pendingServices;
  const totalArea = seasons.reduce(
    (s, season) => s + parseFloat(season.totalAreaHa || "0"),
    0
  );

  const seasonNames = seasons.map((s) => s.name.replace("Safra ", "")).join(" + ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao painel da Fazenda Primavera
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/safras">
            <Wheat className="mr-2 h-4 w-4" />
            Ver Safras
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/agente">
            <Bot className="mr-2 h-4 w-4" />
            Falar com Agente
          </Link>
        </Button>
        {session?.user?.role === "owner" && (
          <Button asChild size="sm" variant="outline">
            <Link href="/financeiro">
              <DollarSign className="mr-2 h-4 w-4" />
              Financeiro
            </Link>
          </Button>
        )}
      </div>

      {/* Summary Cards - All clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/safras">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Safras Ativas
              </CardTitle>
              <Wheat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasons.length}</div>
              <p className="text-xs text-muted-foreground">
                {seasonNames || "Nenhuma safra ativa"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/talhoes">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Área Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ha
              </div>
              <p className="text-xs text-muted-foreground">
                {seasons
                  .map(
                    (s) =>
                      `${s.totalAreaHa} ha ${s.cropType === "soy" ? "soja" : s.cropType === "corn" ? "milho" : s.cropType}`
                  )
                  .join(" + ")}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={seasons[0] ? `/safras/${seasons[0].id}/insumos` : "/safras"}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Custos Totais
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalCosts.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Insumos + Serviços
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={seasons[0] ? `/safras/${seasons[0].id}/planejamento` : "/safras"}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximas Atividades
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingActivities.length}</div>
              <p className="text-xs text-muted-foreground">
                Atividades planejadas
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts */}
      {(costChartData.length > 0 || monthlyExpensesData.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {costChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Custos por Safra
                </CardTitle>
                <CardDescription>Insumos vs Serviços</CardDescription>
              </CardHeader>
              <CardContent>
                <CostBreakdownChart data={costChartData} />
              </CardContent>
            </Card>
          )}
          {monthlyExpensesData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Gastos Mensais 2026
                </CardTitle>
                <CardDescription>Controle financeiro</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyExpensesChart data={monthlyExpensesData} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI Insights / Alerts */}
      {totalPending > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Alertas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium">Pagamentos pendentes</p>
                <p className="text-xs text-muted-foreground">
                  Existem{" "}
                  {totalPending.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}{" "}
                  em insumos e serviços com pagamento pendente.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Financeiro
              </Badge>
            </div>
            {upcomingActivities.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Atividades programadas</p>
                  <p className="text-xs text-muted-foreground">
                    {upcomingActivities.length} atividade(s) planejada(s):{" "}
                    {upcomingActivities
                      .slice(0, 3)
                      .map((a) => a.title)
                      .join(", ")}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Planejamento
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades Recentes</CardTitle>
            <CardDescription>
              Últimas atividades concluídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.scheduledDate &&
                          new Date(activity.scheduledDate).toLocaleDateString(
                            "pt-BR"
                          )}
                        {activity.quantity && ` - ${activity.quantity}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
