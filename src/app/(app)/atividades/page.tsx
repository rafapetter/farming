import { db } from "@/server/db";
import {
  activities,
  cropSeasons,
  fields,
  machines,
  workerAssignments,
  workers,
  farms,
} from "@/server/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { HardHat, MapPin } from "lucide-react";
import { AtividadesClient } from "./atividades-client";

export default async function AtividadesPage() {
  let activityList: Array<{
    id: string;
    title: string;
    activityType: string;
    status: string;
    scheduledDate: string | null;
    completedDate: string | null;
    hoursUsed: string | null;
    machineId: string | null;
    quantity: string | null;
    observations: string | null;
    seasonId: string;
    seasonName: string;
    fieldName: string | null;
    machineName: string | null;
    machineType: string | null;
  }> = [];

  let seasonList: Array<{ id: string; name: string }> = [];
  let machineList: Array<{
    id: string;
    name: string;
    type: string;
    ownership: string;
  }> = [];

  let recentAssignments: Array<{
    id: string;
    workerName: string;
    fieldName: string | null;
    date: string;
    hoursWorked: string | null;
    cost: string | null;
    description: string | null;
  }> = [];

  let stats = {
    total: 0,
    completed: 0,
    inProgress: 0,
    planned: 0,
    overdue: 0,
    withMachine: 0,
  };

  try {
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);

    // Fetch safras for the "add" form
    seasonList = await db
      .select({ id: cropSeasons.id, name: cropSeasons.name })
      .from(cropSeasons)
      .orderBy(desc(cropSeasons.createdAt));

    // Fetch machines for the form
    if (farm) {
      machineList = await db
        .select({
          id: machines.id,
          name: machines.name,
          type: machines.type,
          ownership: machines.ownership,
        })
        .from(machines)
        .where(and(eq(machines.farmId, farm.id), eq(machines.active, true)));
    }

    // Fetch all activities with season and field names
    const rawActivities = await db
      .select({
        id: activities.id,
        title: activities.title,
        activityType: activities.activityType,
        status: activities.status,
        scheduledDate: activities.scheduledDate,
        completedDate: activities.completedDate,
        hoursUsed: activities.hoursUsed,
        machineId: activities.machineId,
        quantity: activities.quantity,
        observations: activities.observations,
        seasonId: activities.seasonId,
        seasonName: cropSeasons.name,
        fieldName: fields.name,
        machineName: machines.name,
        machineType: machines.type,
      })
      .from(activities)
      .leftJoin(cropSeasons, eq(activities.seasonId, cropSeasons.id))
      .leftJoin(fields, eq(activities.fieldId, fields.id))
      .leftJoin(machines, eq(activities.machineId, machines.id))
      .orderBy(desc(activities.scheduledDate));

    activityList = rawActivities.map((a) => ({
      ...a,
      seasonName: a.seasonName ?? "Safra",
    }));

    // Compute stats
    const today = new Date().toISOString().split("T")[0];
    for (const a of activityList) {
      stats.total++;
      if (a.status === "completed") stats.completed++;
      else if (a.status === "in_progress") stats.inProgress++;
      else if (a.status === "planned") stats.planned++;
      if (a.machineName) stats.withMachine++;
      if (
        a.scheduledDate &&
        a.scheduledDate < today &&
        a.status !== "completed" &&
        a.status !== "cancelled"
      ) {
        stats.overdue++;
      }
    }

    // Recent worker assignments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const assignments = await db
      .select({
        id: workerAssignments.id,
        workerName: workers.name,
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
      .orderBy(desc(workerAssignments.date))
      .limit(20);

    recentAssignments = assignments.map((a) => ({
      id: a.id,
      workerName: a.workerName ?? "—",
      fieldName: a.fieldName ?? null,
      date: a.date,
      hoursWorked: a.hoursWorked,
      cost: a.cost,
      description: a.description,
    }));
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground">
          Atividades de todas as safras com trabalhadores e máquinas
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.inProgress}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planejadas</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.planned}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.overdue}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Com Máquina</p>
            <p className="text-2xl font-bold">{stats.withMachine}</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive activities list */}
      <AtividadesClient
        activities={activityList}
        seasons={seasonList}
        machines={machineList}
      />

      {/* Recent worker assignments */}
      {recentAssignments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <HardHat className="h-4 w-4" />
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
                      <th className="text-left px-4 py-2 text-xs font-medium hidden md:table-cell">
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
                          {new Date(
                            a.date + "T12:00:00"
                          ).toLocaleDateString("pt-BR")}
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
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">
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
