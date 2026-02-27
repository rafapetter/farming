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
import { Plus, Loader2 } from "lucide-react";
import { createService } from "@/server/actions/services";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";

export function ServiceFormDialog({ seasonId }: { seasonId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createService(seasonId, formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              name="description"
              required
              placeholder="Ex: Pulverização pré-plantio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workerName">Trabalhador</Label>
              <Input
                id="workerName"
                name="workerName"
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Pagamento</Label>
              <Select name="paymentStatus" defaultValue="pending">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hectares">Hectares</Label>
              <Input
                id="hectares"
                name="hectares"
                type="number"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerHectare">R$/Hectare</Label>
              <Input
                id="costPerHectare"
                name="costPerHectare"
                type="number"
                step="0.01"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Horas</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerHour">R$/Hora</Label>
              <Input
                id="costPerHour"
                name="costPerHour"
                type="number"
                step="0.01"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalCost">Valor Total (deixe em branco para calcular)</Label>
            <Input
              id="totalCost"
              name="totalCost"
              type="number"
              step="0.01"
              placeholder="Auto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar Serviço
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
