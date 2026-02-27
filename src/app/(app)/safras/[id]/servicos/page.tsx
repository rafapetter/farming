import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, services } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ServiceFormDialog } from "@/components/forms/service-form-dialog";
import { ServicePaymentSelect } from "@/components/forms/service-payment-select";

function formatCurrency(value: string | null) {
  if (!value) return "–";
  return parseFloat(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ServicosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let season;
  let servicesList: Array<{
    id: string;
    description: string;
    hectares: string | null;
    hours: string | null;
    costPerHectare: string | null;
    costPerHour: string | null;
    totalCost: string | null;
    paymentStatus: string;
    workerName: string | null;
  }> = [];

  try {
    const [s] = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.id, id))
      .limit(1);
    season = s;

    if (season) {
      servicesList = await db
        .select()
        .from(services)
        .where(eq(services.seasonId, id))
        .orderBy(services.createdAt);
    }
  } catch {
    notFound();
  }

  if (!season) notFound();

  const totalPaid = servicesList
    .filter((s) => s.paymentStatus === "paid")
    .reduce((sum, s) => sum + parseFloat(s.totalCost || "0"), 0);

  const totalPending = servicesList
    .filter((s) => s.paymentStatus === "pending")
    .reduce((sum, s) => sum + parseFloat(s.totalCost || "0"), 0);

  const totalGeral = totalPaid + totalPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/safras/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">{season.name}</p>
        </div>
        <ServiceFormDialog seasonId={id} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(totalPaid.toFixed(2))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-yellow-600">
              {formatCurrency(totalPending.toFixed(2))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {formatCurrency(totalGeral.toFixed(2))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Trabalhador
                  </TableHead>
                  <TableHead className="text-right">Hectares</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Horas
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    R$/Hect
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesList.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium max-w-[250px]">
                      {service.description}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {service.workerName ?? "–"}
                    </TableCell>
                    <TableCell className="text-right">
                      {service.hectares ?? "–"}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {service.hours ?? "–"}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {service.costPerHectare
                        ? formatCurrency(service.costPerHectare)
                        : service.costPerHour
                          ? `${formatCurrency(service.costPerHour)}/h`
                          : "–"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(service.totalCost)}
                    </TableCell>
                    <TableCell>
                      <ServicePaymentSelect
                        serviceId={service.id}
                        seasonId={id}
                        value={service.paymentStatus as "pending" | "paid" | "partial"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-bold">
                    Total Geral
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalGeral.toFixed(2))}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
