"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Zap } from "lucide-react";
import { createService } from "@/server/actions/services";
import { estimateMachineCost } from "@/server/actions/machines";
import {
  PAYMENT_STATUS_LABELS,
  MACHINE_TYPE_LABELS,
  MACHINE_OWNERSHIP_LABELS,
} from "@/lib/constants";

interface Machine {
  id: string;
  name: string;
  type: string;
  ownership: string;
  hourlyRate: string | null;
  fuelConsumptionLH: string | null;
  fuelPricePerL: string | null;
  maintenanceCostPerH: string | null;
}

interface CostEstimate {
  estimatedHours: number;
  fuelCost: number;
  maintenanceCost: number;
  hourlyRate: number;
  totalEstimate: number;
}

export function ServiceFormDialog({
  seasonId,
  machines = [],
  areaHa,
}: {
  seasonId: string;
  machines?: Machine[];
  areaHa?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleEstimate = useCallback(
    async (machineId: string, area: number) => {
      if (!machineId || machineId === "none" || !area) {
        setEstimate(null);
        return;
      }
      setEstimating(true);
      try {
        const result = await estimateMachineCost(machineId, area, "other");
        setEstimate(result);
      } catch {
        setEstimate(null);
      }
      setEstimating(false);
    },
    []
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Clean up empty machineId
    if (formData.get("machineId") === "none") {
      formData.delete("machineId");
    }
    const result = await createService(seasonId, formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      setSelectedMachineId("");
      setEstimate(null);
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <Button size="sm" disabled>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar
      </Button>
    );
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

          {/* Machine selection */}
          {machines.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="machineId">Máquina</Label>
              <Select
                name="machineId"
                defaultValue="none"
                onValueChange={(val) => {
                  setSelectedMachineId(val);
                  if (val !== "none" && areaHa) {
                    handleEstimate(val, areaHa);
                  } else {
                    setEstimate(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}{" "}
                      <span className="text-muted-foreground">
                        ({MACHINE_TYPE_LABELS[m.type] ?? m.type} -{" "}
                        {MACHINE_OWNERSHIP_LABELS[m.ownership] ?? m.ownership})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cost estimate suggestion */}
          {estimating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Estimando custos...
            </div>
          )}
          {estimate && !estimating && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Estimativa de Custo
                {areaHa && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {areaHa} ha
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Horas estimadas:</span>
                <span>{estimate.estimatedHours}h</span>
                <span className="text-muted-foreground">Custo combustível:</span>
                <span>R$ {estimate.fuelCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Manutenção:</span>
                <span>R$ {estimate.maintenanceCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Taxa horária:</span>
                <span>R$ {estimate.hourlyRate.toFixed(2)}/h</span>
                <span className="font-medium pt-1 border-t">Total estimado:</span>
                <span className="font-medium pt-1 border-t">
                  R$ {estimate.totalEstimate.toFixed(2)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full mt-1"
                onClick={() => {
                  // Auto-fill fuel and maintenance costs from estimate
                  const fuelInput = document.getElementById("fuelCost") as HTMLInputElement;
                  const maintInput = document.getElementById("maintenanceCost") as HTMLInputElement;
                  const hoursInput = document.getElementById("hours") as HTMLInputElement;
                  const totalInput = document.getElementById("totalCost") as HTMLInputElement;
                  if (fuelInput) fuelInput.value = estimate.fuelCost.toFixed(2);
                  if (maintInput) maintInput.value = estimate.maintenanceCost.toFixed(2);
                  if (hoursInput) hoursInput.value = estimate.estimatedHours.toString();
                  if (totalInput) totalInput.value = estimate.totalEstimate.toFixed(2);
                }}
              >
                Usar estimativa
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hectares">Hectares</Label>
              <Input
                id="hectares"
                name="hectares"
                type="number"
                step="0.01"
                placeholder="0"
                defaultValue={areaHa ?? ""}
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

          {/* Fuel and maintenance costs */}
          {selectedMachineId && selectedMachineId !== "none" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuelCost">Custo Combustível (R$)</Label>
                <Input
                  id="fuelCost"
                  name="fuelCost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceCost">Custo Manutenção (R$)</Label>
                <Input
                  id="maintenanceCost"
                  name="maintenanceCost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="totalCost">
              Valor Total (deixe em branco para calcular)
            </Label>
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
