import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  farms,
  fields,
  cropSeasons,
  loans,
  inputs,
  services,
  financialEntries,
  telegramLinks,
  weatherAlertRules,
} from "@/server/db/schema";
import { eq, sum } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Sprout,
  MapPin,
  Landmark,
  DollarSign,
  Scale,
  CloudAlert,
} from "lucide-react";
import { LoanFormDialog } from "@/components/forms/loan-form-dialog";
import { FarmEditDialog } from "@/components/forms/farm-edit-dialog";
import { TelegramSetup } from "@/components/telegram-setup";

export default async function ConfiguracoesPage() {
  const session = await auth();

  let farm: {
    id: string;
    name: string;
    location: string | null;
    latitude: string | null;
    longitude: string | null;
    totalAreaHa: string | null;
  } | null = null;
  let farmFields: Array<{ name: string; areaHa: string | null }> = [];
  let seasons: Array<{ id: string }> = [];
  let farmLoans: Array<{
    id: string;
    description: string;
    bank: string | null;
    totalAmount: string;
    amountPayable: string | null;
    interestRate: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    notes: string | null;
  }> = [];
  let telegramLinked: Array<{
    id: string;
    chatId: string;
    username: string | null;
    active: boolean;
  }> = [];
  let alertRules: Array<{
    id: string;
    metric: string;
    threshold: string;
    enabled: boolean;
  }> = [];
  let totalInputsCost = 0;
  let totalServicesCost = 0;
  let totalFinancialExpenses = 0;
  let totalFinancialIncome = 0;

  try {
    const allFarms = await db.select().from(farms).limit(1);
    farm = allFarms[0] ?? null;

    if (farm) {
      farmFields = await db
        .select({ name: fields.name, areaHa: fields.areaHa })
        .from(fields)
        .where(eq(fields.farmId, farm.id));

      seasons = await db
        .select({ id: cropSeasons.id })
        .from(cropSeasons)
        .where(eq(cropSeasons.farmId, farm.id));

      farmLoans = await db
        .select()
        .from(loans)
        .where(eq(loans.farmId, farm.id));

      telegramLinked = await db
        .select({
          id: telegramLinks.id,
          chatId: telegramLinks.chatId,
          username: telegramLinks.username,
          active: telegramLinks.active,
        })
        .from(telegramLinks)
        .where(eq(telegramLinks.farmId, farm.id));

      alertRules = await db
        .select({
          id: weatherAlertRules.id,
          metric: weatherAlertRules.metric,
          threshold: weatherAlertRules.threshold,
          enabled: weatherAlertRules.enabled,
        })
        .from(weatherAlertRules)
        .where(eq(weatherAlertRules.farmId, farm.id));

      for (const s of seasons) {
        const [iSum] = await db
          .select({ total: sum(inputs.totalPrice) })
          .from(inputs)
          .where(eq(inputs.seasonId, s.id));
        totalInputsCost += parseFloat(iSum?.total ?? "0");

        const [sSum] = await db
          .select({ total: sum(services.totalCost) })
          .from(services)
          .where(eq(services.seasonId, s.id));
        totalServicesCost += parseFloat(sSum?.total ?? "0");
      }

      const [expSum] = await db
        .select({ total: sum(financialEntries.amount) })
        .from(financialEntries)
        .where(eq(financialEntries.type, "expense"));
      totalFinancialExpenses = parseFloat(expSum?.total ?? "0");

      const [incSum] = await db
        .select({ total: sum(financialEntries.amount) })
        .from(financialEntries)
        .where(eq(financialEntries.type, "income"));
      totalFinancialIncome = parseFloat(incSum?.total ?? "0");
    }
  } catch {
    // DB not connected
  }

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalArea = farmFields.reduce(
    (s, f) => s + parseFloat(f.areaHa || "0"),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Informações da propriedade, proprietário e resumo geral
        </p>
      </div>

      {/* Profile & Farm */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Proprietário</CardTitle>
            </div>
            <CardDescription>Informações do usuário logado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{session?.user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Papel</p>
              <Badge variant="secondary">
                {session?.user?.role === "owner" ? "Proprietário" : "Consultor"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Propriedade</CardTitle>
              </div>
              {farm && <FarmEditDialog farm={farm} />}
            </div>
            <CardDescription>Dados da fazenda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{farm?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Localização</p>
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">{farm?.location ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Área Total (Safras)</p>
              <p className="text-sm font-medium">
                {farm?.totalAreaHa
                  ? `${parseFloat(farm.totalAreaHa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} hectares`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Talhões</p>
              <p className="text-sm font-medium">
                {farmFields.length} talhões
                {totalArea > 0
                  ? ` (${totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ha mapeados)`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Resumo de Custos</CardTitle>
            </div>
            <CardDescription>Custos totais das safras ativas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Insumos</p>
              <p className="text-sm font-medium">{fmt(totalInputsCost)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Serviços</p>
              <p className="text-sm font-medium">{fmt(totalServicesCost)}</p>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <p className="text-sm font-medium">Total Safras</p>
              <p className="text-sm font-bold">
                {fmt(totalInputsCost + totalServicesCost)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Controle Financeiro</CardTitle>
            </div>
            <CardDescription>Despesas e receitas pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-sm font-medium text-red-600">
                {fmt(totalFinancialExpenses)}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-sm font-medium text-green-600">
                {fmt(totalFinancialIncome)}
              </p>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <p className="text-sm font-medium">Saldo</p>
              <p
                className={`text-sm font-bold ${totalFinancialIncome - totalFinancialExpenses >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {fmt(totalFinancialIncome - totalFinancialExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telegram & Weather Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <TelegramSetup links={telegramLinked} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CloudAlert className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Alertas Climáticos</CardTitle>
            </div>
            <CardDescription>Regras de alerta configuradas</CardDescription>
          </CardHeader>
          <CardContent>
            {alertRules.length > 0 ? (
              <div className="space-y-2">
                {alertRules.map((rule) => {
                  const labels: Record<string, string> = {
                    temp_high: "Temp. alta",
                    temp_low: "Temp. baixa",
                    wind: "Vento forte",
                    humidity_low: "Umidade baixa",
                    frost: "Geada",
                    heavy_rain: "Chuva forte",
                  };
                  const units: Record<string, string> = {
                    temp_high: "°C",
                    temp_low: "°C",
                    wind: "km/h",
                    humidity_low: "%",
                    frost: "°C",
                    heavy_rain: "mm",
                  };
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-lg border p-2 px-3"
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {labels[rule.metric] ?? rule.metric}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {rule.metric.includes("low") || rule.metric === "frost"
                            ? "≤"
                            : "≥"}{" "}
                          {rule.threshold}
                          {units[rule.metric] ?? ""}
                        </span>
                      </div>
                      <Badge
                        variant={rule.enabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {rule.enabled ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma regra de alerta configurada. As regras padrão serão criadas automaticamente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Empréstimos</CardTitle>
            </div>
            <LoanFormDialog />
          </div>
          <CardDescription>Financiamentos bancários</CardDescription>
        </CardHeader>
        <CardContent>
          {farmLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum empréstimo registrado.</p>
          ) : (
            <div className="space-y-3">
              {farmLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{loan.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.bank ?? "Banco"} — Empréstimo:{" "}
                      {fmt(parseFloat(loan.totalAmount))}
                      {loan.amountPayable &&
                        ` — A pagar: ${fmt(parseFloat(loan.amountPayable))}`}
                      {loan.interestRate &&
                        ` — Juros: ${loan.interestRate}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <LoanFormDialog loan={loan} />
                    <Badge
                      variant={
                        loan.status === "active" ? "destructive" : "secondary"
                      }
                    >
                      {loan.status === "active" ? "Em aberto" : "Quitado"}
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-medium">Total a pagar</span>
                <span className="font-bold">
                  {fmt(
                    farmLoans.reduce(
                      (s, l) => s + parseFloat(l.amountPayable ?? l.totalAmount),
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
