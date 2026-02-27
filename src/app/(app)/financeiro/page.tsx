import { db } from "@/server/db";
import { financialEntries } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
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
import { DollarSign } from "lucide-react";
import { FinancialFormDialog } from "@/components/forms/financial-form-dialog";

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

export default async function FinanceiroPage() {
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

  try {
    entries = await db
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.year, 2026))
      .orderBy(financialEntries.date);
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

  const yearTotal = entries.reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );

  const activeMonths = Array.from(entriesByMonth.keys()).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Controle Financeiro
          </h1>
          <p className="text-muted-foreground">Controle Financeiro 2026</p>
        </div>
        <FinancialFormDialog />
      </div>

      {/* Year Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Total Saídas 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(yearTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Total Entradas 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Tabs */}
      {activeMonths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma entrada financeira cadastrada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={String(activeMonths[0])}>
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
              (sum, e) => sum + parseFloat(e.amount),
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
                              <TableCell className="font-medium">
                                {entry.category}
                                {entry.description && (
                                  <span className="text-muted-foreground ml-1">
                                    - {entry.description}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
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
