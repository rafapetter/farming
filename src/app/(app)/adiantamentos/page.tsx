import { db } from "@/server/db";
import { advances, cropSeasons } from "@/server/db/schema";
import { desc, eq, sum } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HandCoins, CalendarDays } from "lucide-react";
import { AdvanceFormDialog } from "@/components/forms/advance-form-dialog";

function formatCurrency(value: string | number | null) {
  if (!value) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdiantamentosPage() {
  let advancesList: Array<{
    id: string;
    recipient: string;
    product: string | null;
    quantity: string | null;
    value: string | null;
    date: string | null;
    notes: string | null;
    seasonId: string;
  }> = [];
  let seasons: Array<{ id: string; name: string }> = [];
  let seasonMap = new Map<string, string>();

  try {
    advancesList = await db
      .select()
      .from(advances)
      .orderBy(desc(advances.date));

    seasons = await db
      .select({ id: cropSeasons.id, name: cropSeasons.name })
      .from(cropSeasons);

    for (const s of seasons) {
      seasonMap.set(s.id, s.name);
    }
  } catch {
    // DB not connected
  }

  const totalValue = advancesList.reduce(
    (s, a) => s + parseFloat(a.value || "0"),
    0
  );

  const byRecipient = new Map<string, number>();
  for (const a of advancesList) {
    const current = byRecipient.get(a.recipient) ?? 0;
    byRecipient.set(a.recipient, current + parseFloat(a.value || "0"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adiantamentos</h1>
          <p className="text-muted-foreground">
            Controle de adiantamentos a funcionários e fornecedores
          </p>
        </div>
        <AdvanceFormDialog seasons={seasons} />
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Total Adiantado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {advancesList.length} adiantamento(s)
            </p>
          </CardContent>
        </Card>
        {Array.from(byRecipient.entries()).map(([name, total]) => (
          <Card key={name}>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                {name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold">
                {formatCurrency(total)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {advancesList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HandCoins className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum adiantamento registrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {advancesList.map((adv) => (
            <Card key={adv.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{adv.recipient}</p>
                      {adv.product && (
                        <Badge variant="outline" className="text-xs">
                          {adv.product}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {adv.date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(adv.date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {adv.quantity && <span>• Qtd: {adv.quantity}</span>}
                      <span>• {seasonMap.get(adv.seasonId) ?? "Safra"}</span>
                    </div>
                    {adv.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {adv.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold">
                    {formatCurrency(adv.value)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
