import { db } from "@/server/db";
import { workers, workerAssignments, fields } from "@/server/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Calendar, Clock, MapPin } from "lucide-react";
import { WorkerFormDialog } from "@/components/forms/worker-form-dialog";
import { WorkerAssignmentDialog } from "@/components/forms/worker-assignment-dialog";

const ROLE_LABELS: Record<string, string> = {
  trabalhador: "Trabalhador",
  operador: "Operador",
  diarista: "Diarista",
  tratorista: "Tratorista",
  other: "Outro",
};

export default async function TrabalhoresPage() {
  let workerList: Array<{
    id: string;
    name: string;
    role: string;
    phone: string | null;
    dailyRate: string | null;
    hireDate: string | null;
    notes: string | null;
    active: boolean;
  }> = [];

  let fieldList: Array<{ id: string; name: string }> = [];
  let recentAssignments: Array<{
    id: string;
    workerId: string;
    workerName: string;
    fieldName: string | null;
    date: string;
    hoursWorked: string | null;
    cost: string | null;
    description: string | null;
  }> = [];

  // Per-worker stats for current month
  let workerStats: Record<
    string,
    { totalHours: number; totalCost: number; daysWorked: number }
  > = {};

  try {
    workerList = await db
      .select()
      .from(workers)
      .orderBy(workers.active, workers.name);

    fieldList = await db
      .select({ id: fields.id, name: fields.name })
      .from(fields)
      .orderBy(fields.name);

    // Recent assignments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const assignments = await db
      .select({
        id: workerAssignments.id,
        workerId: workerAssignments.workerId,
        workerName: workers.name,
        fieldId: workerAssignments.fieldId,
        fieldName: fields.name,
        date: workerAssignments.date,
        hoursWorked: workerAssignments.hoursWorked,
        cost: workerAssignments.cost,
        description: workerAssignments.description,
      })
      .from(workerAssignments)
      .leftJoin(workers, eq(workerAssignments.workerId, workers.id))
      .leftJoin(fields, eq(workerAssignments.fieldId, fields.id))
      .where(gte(workerAssignments.date, startDate))
      .orderBy(desc(workerAssignments.date));

    recentAssignments = assignments.map((a) => ({
      id: a.id,
      workerId: a.workerId,
      workerName: a.workerName ?? "—",
      fieldName: a.fieldName ?? null,
      date: a.date,
      hoursWorked: a.hoursWorked,
      cost: a.cost,
      description: a.description,
    }));

    // Compute stats per worker
    for (const a of assignments) {
      const wid = a.workerId;
      if (!workerStats[wid]) {
        workerStats[wid] = { totalHours: 0, totalCost: 0, daysWorked: 0 };
      }
      workerStats[wid].totalHours += parseFloat(a.hoursWorked || "0");
      workerStats[wid].totalCost += parseFloat(a.cost || "0");
      workerStats[wid].daysWorked += 1;
    }
  } catch {
    // DB not connected
  }

  const activeWorkers = workerList.filter((w) => w.active);
  const inactiveWorkers = workerList.filter((w) => !w.active);
  const totalCostMonth = Object.values(workerStats).reduce(
    (s, w) => s + w.totalCost,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trabalhadores</h1>
          <p className="text-muted-foreground">
            Equipe de trabalho da fazenda
          </p>
        </div>
        <div className="flex gap-2">
          <WorkerAssignmentDialog
            workers={activeWorkers.map((w) => ({
              id: w.id,
              name: w.name,
            }))}
            fields={fieldList}
          />
          <WorkerFormDialog />
        </div>
      </div>

      {/* Summary cards */}
      {workerList.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{activeWorkers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dias trabalhados (30d)</p>
              <p className="text-2xl font-bold">
                {Object.values(workerStats).reduce(
                  (s, w) => s + w.daysWorked,
                  0
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Horas (30d)</p>
              <p className="text-2xl font-bold">
                {Object.values(workerStats)
                  .reduce((s, w) => s + w.totalHours, 0)
                  .toFixed(0)}
                h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Custo (30d)</p>
              <p className="text-2xl font-bold">
                R${" "}
                {totalCostMonth.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Worker list */}
      {workerList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum trabalhador cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeWorkers.map((worker) => {
            const stats = workerStats[worker.id];
            return (
              <Card key={worker.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {worker.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {worker.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {ROLE_LABELS[worker.role] ?? worker.role}
                        </Badge>
                      </div>
                    </div>
                    <WorkerFormDialog worker={worker} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {worker.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                  {worker.dailyRate && (
                    <p className="text-xs text-muted-foreground">
                      Diária: R$ {parseFloat(worker.dailyRate).toFixed(2)}
                    </p>
                  )}
                  {worker.hireDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Desde{" "}
                        {new Date(
                          worker.hireDate + "T12:00:00"
                        ).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {stats && (
                    <div className="flex gap-3 pt-1 text-xs">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Clock className="h-3 w-3" />
                        {stats.daysWorked}d / {stats.totalHours.toFixed(0)}h
                      </span>
                      <span className="font-medium">
                        R$ {stats.totalCost.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">últimos 30d</span>
                    </div>
                  )}
                  {worker.notes && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {worker.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {inactiveWorkers.map((worker) => (
            <Card key={worker.id} className="opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                      {worker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {worker.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        Inativo
                      </Badge>
                    </div>
                  </div>
                  <WorkerFormDialog worker={worker} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Recent assignments */}
      {recentAssignments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Trabalhos Recentes (30 dias)
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium">
                        Data
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium">
                        Trabalhador
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium hidden sm:table-cell">
                        Talhão
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium hidden sm:table-cell">
                        Descrição
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium">
                        Horas
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium">
                        Custo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignments.map((a) => (
                      <tr key={a.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          {new Date(a.date + "T12:00:00").toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium">
                          {a.workerName}
                        </td>
                        <td className="px-4 py-2 text-xs hidden sm:table-cell">
                          {a.fieldName ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              {a.fieldName}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                          {a.description ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-right">
                          {a.hoursWorked
                            ? `${parseFloat(a.hoursWorked).toFixed(0)}h`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-right font-medium">
                          {a.cost
                            ? `R$ ${parseFloat(a.cost).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
