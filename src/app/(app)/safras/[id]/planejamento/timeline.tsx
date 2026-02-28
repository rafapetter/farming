"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Circle, XCircle, AlertTriangle } from "lucide-react";
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
} from "@/lib/constants";
import {
  ActivityFormDialog,
  type ActivityData,
} from "@/components/forms/activity-form-dialog";
import { ActivityStatusInline } from "@/components/forms/activity-status-inline";

const statusIcons = {
  planned: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const statusColors = {
  planned: "text-blue-500",
  in_progress: "text-yellow-500",
  completed: "text-green-500",
  cancelled: "text-muted-foreground",
};

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  if (diffDays === -1) return "ontem";
  if (diffDays > 1) return `em ${diffDays} dias`;
  return `há ${Math.abs(diffDays)} dias`;
}

function isOverdue(activity: ActivityData): boolean {
  if (!activity.scheduledDate) return false;
  if (activity.status === "completed" || activity.status === "cancelled")
    return false;
  const scheduled = new Date(activity.scheduledDate + "T23:59:59");
  return scheduled < new Date();
}

interface PlanejamentoTimelineProps {
  seasonId: string;
  activities: ActivityData[];
}

export function PlanejamentoTimeline({
  seasonId,
  activities,
}: PlanejamentoTimelineProps) {
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(
    null
  );

  const completed = activities.filter((a) => a.status === "completed").length;
  const total = activities.filter((a) => a.status !== "cancelled").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0];

  // Find where to insert the "today" divider
  let todayInsertIndex = -1;
  for (let i = 0; i < activities.length; i++) {
    const date = activities[i].scheduledDate;
    if (date && date > todayStr) {
      todayInsertIndex = i;
      break;
    }
  }
  // If all dates are in the past, put today at the end
  if (
    todayInsertIndex === -1 &&
    activities.length > 0 &&
    activities.some((a) => a.scheduledDate)
  ) {
    const lastDate = activities[activities.length - 1].scheduledDate;
    if (lastDate && lastDate <= todayStr) {
      todayInsertIndex = activities.length;
    }
  }

  return (
    <>
      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso da Safra</span>
            <span>
              {completed}/{total} ({progressPct}%)
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {activities.filter((a) => a.status === "completed").length} concluídas
        </Badge>
        <Badge variant="outline" className="border-blue-300 text-blue-700">
          {activities.filter((a) => a.status === "planned").length} planejadas
        </Badge>
        <Badge variant="outline" className="border-yellow-300 text-yellow-700">
          {activities.filter((a) => a.status === "in_progress").length} em
          andamento
        </Badge>
        {activities.filter((a) => isOverdue(a)).length > 0 && (
          <Badge variant="outline" className="border-red-300 text-red-700">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {activities.filter((a) => isOverdue(a)).length} atrasadas
          </Badge>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {activities.map((activity, index) => {
          const StatusIcon =
            statusIcons[activity.status as keyof typeof statusIcons] ?? Circle;
          const statusColor =
            statusColors[activity.status as keyof typeof statusColors] ??
            "text-muted-foreground";
          const borderColor =
            ACTIVITY_TYPE_COLORS[activity.activityType] ?? "border-l-gray-400";
          const overdue = isOverdue(activity);

          return (
            <div key={activity.id}>
              {/* Today divider */}
              {todayInsertIndex === index && (
                <div className="relative flex items-center gap-4 py-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20" />
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary/40" />
                    <span className="text-xs font-medium text-primary whitespace-nowrap">
                      Hoje —{" "}
                      {new Date().toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <div className="h-px flex-1 bg-primary/40" />
                  </div>
                </div>
              )}

              <div className="relative flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <StatusIcon
                    className={`h-5 w-5 shrink-0 ${statusColor}`}
                  />
                  {index < activities.length - 1 && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content - clickable card */}
                <Card
                  className={`mb-3 flex-1 border-l-4 ${borderColor} cursor-pointer transition-colors hover:bg-muted/30 ${
                    overdue ? "ring-1 ring-red-300" : ""
                  }`}
                  onClick={() => setEditingActivity(activity)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {activity.title}
                        </CardTitle>
                        {overdue && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                      </div>
                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge variant="outline" className="text-xs">
                          {ACTIVITY_TYPE_LABELS[activity.activityType] ??
                            activity.activityType}
                        </Badge>
                        <ActivityStatusInline
                          activityId={activity.id}
                          seasonId={seasonId}
                          value={
                            activity.status as
                              | "planned"
                              | "in_progress"
                              | "completed"
                              | "cancelled"
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {activity.scheduledDate && (
                        <span>
                          Programada:{" "}
                          {new Date(
                            activity.scheduledDate + "T12:00:00"
                          ).toLocaleDateString("pt-BR")}{" "}
                          <span
                            className={
                              overdue ? "text-red-500 font-medium" : ""
                            }
                          >
                            ({relativeDate(activity.scheduledDate)})
                          </span>
                        </span>
                      )}
                      {activity.completedDate && (
                        <span>
                          Concluída:{" "}
                          {new Date(
                            activity.completedDate + "T12:00:00"
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {activity.quantity && (
                        <span>Quantidade: {activity.quantity}</span>
                      )}
                    </div>
                    {activity.observations && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {activity.observations}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}

        {/* Today divider at the end if all activities are in the past */}
        {todayInsertIndex === activities.length && (
          <div className="relative flex items-center gap-4 py-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-px flex-1 bg-primary/40" />
              <span className="text-xs font-medium text-primary whitespace-nowrap">
                Hoje —{" "}
                {new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <div className="h-px flex-1 bg-primary/40" />
            </div>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editingActivity && (
        <ActivityFormDialog
          seasonId={seasonId}
          activity={editingActivity}
          open={!!editingActivity}
          onOpenChange={(open) => {
            if (!open) setEditingActivity(null);
          }}
        />
      )}
    </>
  );
}
