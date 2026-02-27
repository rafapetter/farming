import { db } from "@/server/db";
import { consultingVisits, users } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList, CalendarDays } from "lucide-react";
import { ConsultingFormDialog } from "@/components/forms/consulting-form-dialog";

export default async function ConsultoriaPage() {
  let visits: Array<{
    id: string;
    visitDate: string;
    activities: string;
    recommendations: string | null;
  }> = [];

  try {
    visits = await db
      .select()
      .from(consultingVisits)
      .orderBy(desc(consultingVisits.visitDate));
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultoria</h1>
          <p className="text-muted-foreground">
            Registro de visitas e atividades
          </p>
        </div>
        <ConsultingFormDialog />
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhuma visita registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">
                    Visita de{" "}
                    {new Date(visit.visitDate).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm text-muted-foreground">
                  {visit.activities}
                </div>
                {visit.recommendations && (
                  <div className="mt-3 rounded-lg bg-accent/50 p-3">
                    <p className="text-xs font-medium mb-1">Recomendações:</p>
                    <p className="text-sm text-muted-foreground">
                      {visit.recommendations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
