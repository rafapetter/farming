import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, activities } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ActivityFormDialog } from "@/components/forms/activity-form-dialog";
import { PlanejamentoTimeline } from "./timeline";

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

      <PlanejamentoTimeline seasonId={id} activities={activityList} />
    </div>
  );
}
