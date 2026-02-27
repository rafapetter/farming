import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cropSeasons, inputs } from "@/server/db/schema";
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
import { INPUT_CATEGORY_LABELS } from "@/lib/constants";
import { InputFormDialog } from "@/components/forms/input-form-dialog";
import { InputPaymentSelect } from "@/components/forms/input-payment-select";

function formatCurrency(value: string | null) {
  if (!value) return "–";
  return parseFloat(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function InsumosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let season;
  let inputsList: Array<{
    id: string;
    name: string;
    category: string;
    packaging: string | null;
    unit: string | null;
    quantity: string | null;
    unitPrice: string | null;
    totalPrice: string | null;
    paymentStatus: string;
    supplier: string | null;
  }> = [];

  try {
    const [s] = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.id, id))
      .limit(1);
    season = s;

    if (season) {
      inputsList = await db
        .select()
        .from(inputs)
        .where(eq(inputs.seasonId, id))
        .orderBy(inputs.createdAt);
    }
  } catch {
    notFound();
  }

  if (!season) notFound();

  const totalPaid = inputsList
    .filter((i) => i.paymentStatus === "paid")
    .reduce((sum, i) => sum + parseFloat(i.totalPrice || "0"), 0);

  const totalPending = inputsList
    .filter((i) => i.paymentStatus === "pending")
    .reduce((sum, i) => sum + parseFloat(i.totalPrice || "0"), 0);

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
          <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
          <p className="text-sm text-muted-foreground">{season.name}</p>
        </div>
        <InputFormDialog seasonId={id} />
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
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Embalagem
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Unidade
                  </TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Valor Unit.
                  </TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inputsList.map((input) => (
                  <TableRow key={input.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {input.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {INPUT_CATEGORY_LABELS[input.category] ??
                          input.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {input.packaging ?? "–"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {input.unit ?? "–"}
                    </TableCell>
                    <TableCell className="text-right">
                      {input.quantity ?? "–"}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {formatCurrency(input.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(input.totalPrice)}
                    </TableCell>
                    <TableCell>
                      <InputPaymentSelect
                        inputId={input.id}
                        seasonId={id}
                        value={input.paymentStatus as "pending" | "paid" | "partial"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-bold">
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
