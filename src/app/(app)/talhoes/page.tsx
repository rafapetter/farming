import { db } from "@/server/db";
import { fields } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, MapPin } from "lucide-react";
import { FieldFormDialog } from "@/components/forms/field-form-dialog";
import { FieldEditDialog } from "@/components/forms/field-edit-dialog";

export default async function TalhoesPage() {
  let fieldsList: Array<{
    id: string;
    name: string;
    areaHa: string | null;
    notes: string | null;
  }> = [];

  try {
    fieldsList = await db.select().from(fields).orderBy(fields.name);
  } catch {
    // DB not connected
  }

  const totalArea = fieldsList.reduce(
    (s, f) => s + parseFloat(f.areaHa || "0"),
    0
  );
  const withoutArea = fieldsList.filter((f) => !f.areaHa);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Talhões</h1>
          <p className="text-muted-foreground">
            Áreas de plantio da fazenda
          </p>
        </div>
        <FieldFormDialog />
      </div>

      {fieldsList.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {fieldsList.length} talhões
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ha total
          </Badge>
          {withoutArea.length > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {withoutArea.length} sem área definida
            </Badge>
          )}
        </div>
      )}

      {fieldsList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Map className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum talhão cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldsList.map((field) => (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{field.name}</CardTitle>
                  </div>
                  <FieldEditDialog field={field} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-sm ${field.areaHa ? "font-medium" : "text-muted-foreground italic"}`}>
                  {field.areaHa
                    ? `${field.areaHa} hectares`
                    : "Clique no lápis para definir a área"}
                </p>
                {field.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {field.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
