"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Pencil } from "lucide-react";
import { createLoan, updateLoan } from "@/server/actions/loans";

interface LoanFormDialogProps {
  loan?: {
    id: string;
    description: string;
    bank: string | null;
    totalAmount: string;
    amountPayable: string | null;
    interestRate: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    notes: string | null;
  };
}

export function LoanFormDialog({ loan }: LoanFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!loan;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEdit
      ? await updateLoan(loan!.id, formData)
      : await createLoan(formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Empréstimo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Empréstimo" : "Novo Empréstimo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              name="description"
              required
              defaultValue={loan?.description}
              placeholder="Ex: Custeio Safra 2025/2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Banco</Label>
            <Input
              id="bank"
              name="bank"
              defaultValue={loan?.bank ?? ""}
              placeholder="Ex: Cresol"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="number"
                step="0.01"
                required
                defaultValue={loan?.totalAmount}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountPayable">Valor a Pagar (R$)</Label>
              <Input
                id="amountPayable"
                name="amountPayable"
                type="number"
                step="0.01"
                defaultValue={loan?.amountPayable ?? ""}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Taxa Juros (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                type="number"
                step="0.01"
                defaultValue={loan?.interestRate ?? ""}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={loan?.startDate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={loan?.endDate ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={loan?.status ?? "active"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Em aberto</SelectItem>
                <SelectItem value="paid">Quitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={loan?.notes ?? ""}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Cadastrar Empréstimo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
