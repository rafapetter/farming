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
} from "@/server/db/schema";
import { eq, sum, count } from "drizzle-orm";
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
  Wheat,
  DollarSign,
  Scale,
  Calendar,
} from "lucide-react";

export default async function ConfiguracoesPage() {
  const session = await auth();

  let farm: {
    id: string;
    name: string;
    location: string | null;
    totalAreaHa: string | null;
  } | null = null;
  let farmFields: Array<{ name: string; areaHa: string | null }> = [];
  let seasons: Array<{
    id: string;
    name: string;
    cropType: string;
    status: string;
    totalAreaHa: string | null;
    plantingDate: string | null;
    harvestDate: string | null;
  }> = [];
  let farmLoans: Array<{
    description: string;
    bank: string | null;
    totalAmount: string;
    amountPayable: string | null;
    status: string | null;
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

      seasons = await db.select().from(cropSeasons).where(eq(cropSeasons.farmId, farm.id));

      farmLoans = await db
        .select({
          description: loans.description,
          bank: loans.bank,
          totalAmount: loans.totalAmount,
          amountPayable: loans.amountPayable,
          status: loans.status,
        })
        .from(loans)
        .where(eq(loans.farmId, farm.id));

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
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Propriedade</CardTitle>
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

      {/* Safras */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Safras</CardTitle>
          </div>
          <CardDescription>Todas as safras registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {seasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma safra registrada.</p>
          ) : (
            <div className="space-y-3">
              {seasons.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {s.cropType === "soy"
                          ? "Soja"
                          : s.cropType === "corn"
                            ? "Milho"
                            : s.cropType}
                      </span>
                      <span>•</span>
                      <span>{s.totalAreaHa ?? "?"} ha</span>
                      {s.plantingDate && (
                        <>
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(s.plantingDate).toLocaleDateString("pt-BR")}
                            {s.harvestDate &&
                              ` → ${new Date(s.harvestDate).toLocaleDateString("pt-BR")}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={s.status === "active" ? "default" : "secondary"}
                  >
                    {s.status === "active"
                      ? "Ativa"
                      : s.status === "planning"
                        ? "Planejamento"
                        : s.status === "harvested"
                          ? "Colhida"
                          : "Encerrada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Loans */}
      {farmLoans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Empréstimos</CardTitle>
            </div>
            <CardDescription>Financiamentos bancários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {farmLoans.map((loan, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{loan.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.bank ?? "Banco"} — Empréstimo:{" "}
                      {fmt(parseFloat(loan.totalAmount))}
                      {loan.amountPayable &&
                        ` — A pagar: ${fmt(parseFloat(loan.amountPayable))}`}
                    </p>
                  </div>
                  <Badge
                    variant={
                      loan.status === "active" ? "destructive" : "secondary"
                    }
                  >
                    {loan.status === "active" ? "Em aberto" : "Quitado"}
                  </Badge>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
