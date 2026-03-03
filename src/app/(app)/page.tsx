import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  cropSeasons,
  inputs,
  services,
  activities,
  financialEntries,
  farms,
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
  Brain,
  CloudRain,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CostBreakdownChart } from "@/components/charts/cost-breakdown-chart";
import { MonthlyExpensesChart } from "@/components/charts/monthly-expenses-chart";
import { RainTimelineChart } from "@/components/charts/rain-timeline-chart";
import { getMergedRainData } from "@/lib/rain-api";
import { getLatestCepeaPrices } from "@/lib/cepea-api";
import { getRecentAlerts } from "@/lib/weather-alerts";

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
  const currentYear = new Date().getFullYear();

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
      .where(eq(financialEntries.year, currentYear));
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

  // Rain data
  let rainData: Array<{ date: string; precipitationMm: number; source: "api" | "manual" }> = [];
  let totalRainMm = 0;
  let last7DaysRain = 0;
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    rainData = await getMergedRainData(thirtyDaysAgo, todayStr);
    totalRainMm = rainData.reduce((s, d) => s + d.precipitationMm, 0);
    last7DaysRain = rainData.slice(-7).reduce((s, d) => s + d.precipitationMm, 0);
  } catch {
    // rain API errors should not break dashboard
  }

  // Commodity prices
  let latestSoyPrice: number | null = null;
  let latestCornPrice: number | null = null;
  try {
    const soyPrices = await getLatestCepeaPrices("soy", 1);
    const cornPrices = await getLatestCepeaPrices("corn", 1);
    if (soyPrices.length > 0) latestSoyPrice = soyPrices[0].pricePerSack;
    if (cornPrices.length > 0) latestCornPrice = cornPrices[0].pricePerSack;
  } catch {
    // price fetch errors should not break dashboard
  }

  // Weather alerts
  let weatherAlertCount = 0;
  try {
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
    if (farm) {
      const alerts = await getRecentAlerts(farm.id, 3);
      weatherAlertCount = alerts.length;
    }
  } catch {
    // alert errors should not break dashboard
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
        <Button asChild size="sm" variant="outline">
          <Link href="/analises">
            <Brain className="mr-2 h-4 w-4" />
            Análises IA
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Link href="/safras">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Safras Ativas
              </CardTitle>
              <Wheat className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{seasons.length}</div>
              <p className="text-xs text-muted-foreground truncate">
                {seasonNames || "Nenhuma safra ativa"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/talhoes">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Área Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold truncate">
                {totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ha
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {seasons
                  .map(
                    (s) =>
                      `${s.totalAreaHa}ha ${s.cropType === "soy" ? "soja" : "milho"}`
                  )
                  .join(" + ")}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={seasons[0] ? `/safras/${seasons[0].id}/insumos` : "/safras"}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Custos Totais
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold truncate">
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Próximas Atividades
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{upcomingActivities.length}</div>
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
            <Link href="/safras">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
            </Link>
          )}
          {monthlyExpensesData.length > 0 && (
            <Link href="/financeiro">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">
                    Gastos Mensais {currentYear}
                  </CardTitle>
                  <CardDescription>Controle financeiro</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyExpensesChart data={monthlyExpensesData} />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Rain Chart */}
      {rainData.length > 0 && (
        <Link href="/chuvas">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Chuvas</CardTitle>
                  <CardDescription>
                    Últimos 30 dias: {totalRainMm.toFixed(0)} mm | Últimos 7 dias: {last7DaysRain.toFixed(0)} mm
                  </CardDescription>
                </div>
                <CloudRain className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <RainTimelineChart data={rainData} />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Price & Weather Alert Cards */}
      {(latestSoyPrice || latestCornPrice || weatherAlertCount > 0) && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {latestSoyPrice && (
            <Link href="/mercado">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Soja CEPEA</p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {latestSoyPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">por saca 60kg</p>
                </CardContent>
              </Card>
            </Link>
          )}
          {latestCornPrice && (
            <Link href="/mercado">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Milho CEPEA</p>
                  <p className="text-xl font-bold text-yellow-600">
                    R$ {latestCornPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">por saca 60kg</p>
                </CardContent>
              </Card>
            </Link>
          )}
          {weatherAlertCount > 0 && (
            <Link href="/configuracoes">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-yellow-500/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Alertas Climáticos</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {weatherAlertCount}
                  </p>
                  <p className="text-xs text-muted-foreground">alertas ativos</p>
                </CardContent>
              </Card>
            </Link>
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
            <Link href={seasons[0] ? `/safras/${seasons[0].id}/insumos` : "/safras"}>
              <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="flex-1">
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
            </Link>
            {upcomingActivities.length > 0 && (
              <Link href={seasons[0] ? `/safras/${seasons[0].id}/planejamento` : "/safras"}>
                <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  <div className="flex-1">
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
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas atividades concluídas
              </CardDescription>
            </div>
            {seasons[0] && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/safras/${seasons[0].id}/planejamento`}>
                  Ver todas
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/safras/${activity.seasonId}/planejamento`}
                >
                  <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
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
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
