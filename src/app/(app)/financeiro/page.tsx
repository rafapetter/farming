import { db } from "@/server/db";
import { financialEntries, cropSeasons, inputs, services, loans } from "@/server/db/schema";
import { eq, sum } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, TrendingUp, Landmark } from "lucide-react";
import { FinancialFormDialog } from "@/components/forms/financial-form-dialog";
import Link from "next/link";
import { FinancialCalculator } from "@/components/forms/financial-calculator";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = params.ano ? parseInt(params.ano) : currentYear;

  let entries: Array<{
    id: string;
    category: string;
    description: string | null;
    amount: string;
    date: string;
    month: number | null;
    year: number | null;
    type: string;
  }> = [];

  let totalInputsCost = 0;
  let totalServicesCost = 0;
  let loanData: Array<{
    description: string;
    bank: string | null;
    totalAmount: string;
    amountPayable: string | null;
    status: string | null;
  }> = [];

  try {
    entries = await db
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.year, selectedYear))
      .orderBy(financialEntries.date);

    const seasons = await db.select().from(cropSeasons);
    for (const season of seasons) {
      const [iSum] = await db
        .select({ total: sum(inputs.totalPrice) })
        .from(inputs)
        .where(eq(inputs.seasonId, season.id));
      totalInputsCost += parseFloat(iSum?.total ?? "0");

      const [sSum] = await db
        .select({ total: sum(services.totalCost) })
        .from(services)
        .where(eq(services.seasonId, season.id));
      totalServicesCost += parseFloat(sSum?.total ?? "0");
    }

    loanData = await db.select().from(loans);
  } catch {
    // DB not connected
  }

  const entriesByMonth = new Map<number, typeof entries>();
  for (const entry of entries) {
    const month = entry.month ?? 1;
    if (!entriesByMonth.has(month)) {
      entriesByMonth.set(month, []);
    }
    entriesByMonth.get(month)!.push(entry);
  }

  const expenses = entries.filter((e) => e.type === "expense");
  const income = entries.filter((e) => e.type === "income");
  const yearExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const yearIncome = income.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalProductionCost = totalInputsCost + totalServicesCost;
  const totalLoanPayable = loanData.reduce(
    (s, l) => s + parseFloat(l.amountPayable ?? l.totalAmount),
    0
  );

  const activeMonths = Array.from(entriesByMonth.keys()).sort();
  const availableYears = [2025, 2026];

  const categoryTotals = new Map<string, number>();
  for (const entry of expenses) {
    const current = categoryTotals.get(entry.category) ?? 0;
    categoryTotals.set(entry.category, current + parseFloat(entry.amount));
  }
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Controle Financeiro
          </h1>
          <p className="text-muted-foreground">
            Gestão financeira completa da fazenda
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableYears.map((year) => (
            <Link key={year} href={`/financeiro?ano=${year}`}>
              <Badge
                variant={selectedYear === year ? "default" : "outline"}
                className="cursor-pointer"
              >
                {year}
              </Badge>
            </Link>
          ))}
          <FinancialFormDialog />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">
                Despesas {selectedYear}
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">
              {formatCurrency(yearExpenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} lançamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">
                Receitas {selectedYear}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
              {formatCurrency(yearIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {income.length} lançamentos
            </p>
          </CardContent>
        </Card>

        <Link href="/safras">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">
                  Custos Produção
                </CardTitle>
                <DollarSign className="h-4 w-4 text-orange-500 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold text-orange-600 truncate">
                {formatCurrency(totalProductionCost)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Insumos + Serviços
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">
                Empréstimos
              </CardTitle>
              <Landmark className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
              {formatCurrency(totalLoanPayable)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {loanData.length} empréstimo(s) Cresol
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maiores Categorias de Gasto</CardTitle>
            <CardDescription>Top categorias em {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCategories.map(([category, total]) => {
                const percentage = yearExpenses > 0 ? (total / yearExpenses) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Calculator */}
      <FinancialCalculator
        totalProductionCost={totalProductionCost}
        totalAreaSoy={35.8}
      />

      {/* Monthly Tabs */}
      {activeMonths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma entrada financeira cadastrada para {selectedYear}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={String(activeMonths[activeMonths.length - 1])}>
          <TabsList className="flex-wrap h-auto">
            {activeMonths.map((month) => (
              <TabsTrigger key={month} value={String(month)}>
                {MONTHS[month - 1]}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeMonths.map((month) => {
            const monthEntries = entriesByMonth.get(month) ?? [];
            const monthTotal = monthEntries.reduce(
              (s, e) => s + parseFloat(e.amount),
              0
            );

            return (
              <TabsContent key={month} value={String(month)}>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">
                              Valor
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] sm:max-w-none truncate">
                                {entry.category}
                                {entry.description && (
                                  <span className="text-muted-foreground ml-1 hidden sm:inline">
                                    - {entry.description}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                                {formatCurrency(entry.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="font-bold">TOTAL</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(monthTotal)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
