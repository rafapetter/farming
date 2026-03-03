import { db } from "@/server/db";
import { machines, farms, services } from "@/server/db/schema";
import { eq, and, sum, count } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tractor, Fuel, Wrench, Clock } from "lucide-react";
import { MachineFormDialog } from "@/components/forms/machine-form-dialog";
import {
  MACHINE_TYPE_LABELS,
  MACHINE_OWNERSHIP_LABELS,
} from "@/lib/constants";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function MaquinasPage() {
  let farmMachines: Array<{
    id: string;
    name: string;
    type: string;
    ownership: string;
    hourlyRate: string | null;
    fuelConsumptionLH: string | null;
    fuelPricePerL: string | null;
    maintenanceCostPerH: string | null;
    notes: string | null;
    active: boolean;
  }> = [];

  // Stats per machine
  let machineStats: Map<
    string,
    { totalServices: number; totalCost: number; totalHours: number; totalFuel: number }
  > = new Map();

  try {
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
    if (farm) {
      farmMachines = await db
        .select({
          id: machines.id,
          name: machines.name,
          type: machines.type,
          ownership: machines.ownership,
          hourlyRate: machines.hourlyRate,
          fuelConsumptionLH: machines.fuelConsumptionLH,
          fuelPricePerL: machines.fuelPricePerL,
          maintenanceCostPerH: machines.maintenanceCostPerH,
          notes: machines.notes,
          active: machines.active,
        })
        .from(machines)
        .where(eq(machines.farmId, farm.id));

      // Get usage stats for each machine
      for (const m of farmMachines) {
        const [stats] = await db
          .select({
            totalServices: count(),
            totalCost: sum(services.totalCost),
            totalHours: sum(services.hours),
            totalFuel: sum(services.fuelCost),
          })
          .from(services)
          .where(eq(services.machineId, m.id));

        machineStats.set(m.id, {
          totalServices: Number(stats?.totalServices ?? 0),
          totalCost: parseFloat((stats?.totalCost as string) ?? "0"),
          totalHours: parseFloat((stats?.totalHours as string) ?? "0"),
          totalFuel: parseFloat((stats?.totalFuel as string) ?? "0"),
        });
      }
    }
  } catch {
    // DB not connected
  }

  const ownedCount = farmMachines.filter((m) => m.ownership === "owned").length;
  const rentedCount = farmMachines.filter((m) => m.ownership === "rented").length;
  const totalMachineCost = Array.from(machineStats.values()).reduce(
    (s, v) => s + v.totalCost,
    0
  );
  const totalFuelCost = Array.from(machineStats.values()).reduce(
    (s, v) => s + v.totalFuel,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Máquinas</h1>
          <p className="text-muted-foreground">
            Gerenciamento de maquinário e custos operacionais
          </p>
        </div>
        <MachineFormDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{farmMachines.length}</p>
            <p className="text-xs text-muted-foreground">
              {ownedCount} própria{ownedCount !== 1 ? "s" : ""} · {rentedCount}{" "}
              alugada{rentedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Custo Total Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalMachineCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Custo Combustível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {fmt(totalFuelCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Horas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Array.from(machineStats.values())
                .reduce((s, v) => s + v.totalHours, 0)
                .toFixed(1)}
              h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machine List */}
      {farmMachines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Tractor className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground max-w-md">
              Nenhuma máquina registrada. Adicione máquinas para rastrear custos
              de combustível, manutenção e uso nos serviços das safras.
            </p>
            <div className="mt-4">
              <MachineFormDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {farmMachines.map((m) => {
            const stats = machineStats.get(m.id) ?? {
              totalServices: 0,
              totalCost: 0,
              totalHours: 0,
              totalFuel: 0,
            };

            return (
              <Card key={m.id} className={!m.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tractor className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{m.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {!m.active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                      <Badge
                        variant={
                          m.ownership === "owned" ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        {MACHINE_OWNERSHIP_LABELS[m.ownership] ?? m.ownership}
                      </Badge>
                      <MachineFormDialog machine={m} />
                    </div>
                  </div>
                  <CardDescription>
                    {MACHINE_TYPE_LABELS[m.type] ?? m.type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Cost details */}
                    <div className="space-y-2">
                      {m.hourlyRate && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            R$ {parseFloat(m.hourlyRate).toFixed(2)}/h
                          </span>
                        </div>
                      )}
                      {m.fuelConsumptionLH && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {parseFloat(m.fuelConsumptionLH).toFixed(1)} L/h
                            {m.fuelPricePerL &&
                              ` · R$ ${parseFloat(m.fuelPricePerL).toFixed(2)}/L`}
                          </span>
                        </div>
                      )}
                      {m.maintenanceCostPerH && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            R$ {parseFloat(m.maintenanceCostPerH).toFixed(2)}/h
                            manut.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Usage stats */}
                    <div className="space-y-2 text-right">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Serviços: </span>
                        <span className="font-medium">
                          {stats.totalServices}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Horas: </span>
                        <span className="font-medium">
                          {stats.totalHours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Custo: </span>
                        <span className="font-medium">
                          {fmt(stats.totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {m.notes && (
                    <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                      {m.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
