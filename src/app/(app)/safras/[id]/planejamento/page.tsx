import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, activities } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, Circle, XCircle } from "lucide-react";
import Link from "next/link";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { ActivityFormDialog } from "@/components/forms/activity-form-dialog";
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

export default async function PlanejamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let season;
  let activityList: Array<{
    id: string;
    title: string;
    activityType: string;
    scheduledDate: string | null;
    completedDate: string | null;
    quantity: string | null;
    observations: string | null;
    status: string;
  }> = [];

  try {
    const [s] = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.id, id))
      .limit(1);
    season = s;

    if (season) {
      activityList = await db
        .select()
        .from(activities)
        .where(eq(activities.seasonId, id))
        .orderBy(activities.scheduledDate);
    }
  } catch {
    notFound();
  }

  if (!season) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/safras/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Planejamento</h1>
          <p className="text-sm text-muted-foreground">{season.name}</p>
        </div>
        <ActivityFormDialog seasonId={id} />
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {activityList.filter((a) => a.status === "completed").length} concluídas
        </Badge>
        <Badge variant="outline" className="border-blue-300 text-blue-700">
          {activityList.filter((a) => a.status === "planned").length} planejadas
        </Badge>
        <Badge variant="outline" className="border-yellow-300 text-yellow-700">
          {activityList.filter((a) => a.status === "in_progress").length} em andamento
        </Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {activityList.map((activity, index) => {
          const StatusIcon = statusIcons[activity.status as keyof typeof statusIcons] ?? Circle;
          const statusColor = statusColors[activity.status as keyof typeof statusColors] ?? "text-muted-foreground";

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} />
                {index < activityList.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <Card className="mb-3 flex-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {activity.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {ACTIVITY_TYPE_LABELS[activity.activityType] ??
                          activity.activityType}
                      </Badge>
                      <ActivityStatusInline
                        activityId={activity.id}
                        seasonId={id}
                        value={activity.status as "planned" | "in_progress" | "completed" | "cancelled"}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {activity.scheduledDate && (
                      <span>
                        Data:{" "}
                        {new Date(activity.scheduledDate).toLocaleDateString(
                          "pt-BR"
                        )}
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
          );
        })}
      </div>
    </div>
  );
}
