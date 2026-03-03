"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ListChecks,
  Tractor,
  AlertTriangle,
  MapPin,
  Plus,
} from "lucide-react";
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_COLORS,
} from "@/lib/constants";
import {
  ActivityFormDialog,
  type ActivityData,
} from "@/components/forms/activity-form-dialog";

interface ActivityRow {
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
}

interface SeasonOption {
  id: string;
  name: string;
}

interface MachineOption {
  id: string;
  name: string;
  type: string;
  ownership: string;
}

interface AtividadesClientProps {
  activities: ActivityRow[];
  seasons: SeasonOption[];
  machines: MachineOption[];
}

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function AtividadesClient({
  activities,
  seasons,
  machines,
}: AtividadesClientProps) {
  const [mounted, setMounted] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  useEffect(() => setMounted(true), []);

  const today = new Date().toISOString().split("T")[0];

  // Convert an ActivityRow to ActivityData for the form
  function toActivityData(row: ActivityRow): ActivityData {
    return {
      id: row.id,
      title: row.title,
      activityType: row.activityType,
      status: row.status,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
      machineId: row.machineId,
      hoursUsed: row.hoursUsed,
      quantity: row.quantity,
      observations: row.observations,
    };
  }

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Add button with season selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Todas as Atividades
        </h2>
        {seasons.length > 0 && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Atividade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Selecione a Safra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  value={selectedSeasonId}
                  onValueChange={setSelectedSeasonId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma safra..." />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSeasonId && (
                  <ActivityFormDialog
                    seasonId={selectedSeasonId}
                    machines={machines}
                    trigger={
                      <Button className="w-full">Continuar</Button>
                    }
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Activities table */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma atividade cadastrada ainda.
            </p>
            {seasons.length > 0 && (
              <div className="mt-4">
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Atividade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Selecione a Safra</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        value={selectedSeasonId}
                        onValueChange={setSelectedSeasonId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma safra..." />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSeasonId && (
                        <ActivityFormDialog
                          seasonId={selectedSeasonId}
                          machines={machines}
                          trigger={
                            <Button className="w-full">Continuar</Button>
                          }
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium">
                      Atividade
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium hidden sm:table-cell">
                      Safra
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium hidden md:table-cell">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium hidden lg:table-cell">
                      Máquina
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium hidden md:table-cell">
                      Data
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => {
                    const overdue =
                      activity.scheduledDate &&
                      activity.scheduledDate < today &&
                      activity.status !== "completed" &&
                      activity.status !== "cancelled";
                    const borderColor =
                      ACTIVITY_TYPE_COLORS[activity.activityType] ??
                      "border-l-gray-400";
                    return (
                      <tr
                        key={activity.id}
                        className={`border-t hover:bg-muted/50 border-l-4 ${borderColor} cursor-pointer transition-colors`}
                        onClick={() => setEditingActivity(activity)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {activity.title}
                            {overdue && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </p>
                          {activity.fieldName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {activity.fieldName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs hidden sm:table-cell text-primary">
                          {activity.seasonName}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {ACTIVITY_TYPE_LABELS[activity.activityType] ??
                              activity.activityType}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs hidden lg:table-cell">
                          {activity.machineName ? (
                            <span className="flex items-center gap-1">
                              <Tractor className="h-3 w-3 text-primary" />
                              {activity.machineName}
                              {activity.hoursUsed && (
                                <span className="text-muted-foreground ml-1">
                                  (
                                  {parseFloat(activity.hoursUsed).toFixed(1)}h)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs hidden md:table-cell whitespace-nowrap">
                          {activity.scheduledDate
                            ? new Date(
                                activity.scheduledDate + "T12:00:00"
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[activity.status] ?? ""
                            }`}
                          >
                            {ACTIVITY_STATUS_LABELS[activity.status] ??
                              activity.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      {editingActivity && (
        <ActivityFormDialog
          seasonId={editingActivity.seasonId}
          activity={toActivityData(editingActivity)}
          machines={machines}
          open={!!editingActivity}
          onOpenChange={(open) => {
            if (!open) setEditingActivity(null);
          }}
        />
      )}
    </>
  );
}
