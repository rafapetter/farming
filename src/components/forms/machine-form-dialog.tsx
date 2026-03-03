"use client";

import { useState, useEffect } from "react";
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
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  createMachine,
  updateMachine,
  deleteMachine,
} from "@/server/actions/machines";
import {
  MACHINE_TYPE_LABELS,
  MACHINE_OWNERSHIP_LABELS,
} from "@/lib/constants";

interface MachineFormDialogProps {
  machine?: {
    id: string;
    name: string;
    type: string;
    ownership: string;
    hourlyRate: string | null;
    fuelConsumptionLH: string | null;
    fuelPricePerL: string | null;
    maintenanceCostPerH: string | null;
    notes: string | null;
  };
}

export function MachineFormDialog({ machine }: MachineFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (machine) {
      await updateMachine(machine.id, formData);
    } else {
      await createMachine(formData);
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!machine) return;
    if (!confirm("Tem certeza que deseja excluir esta máquina?")) return;
    setDeleting(true);
    await deleteMachine(machine.id);
    setDeleting(false);
    setOpen(false);
    router.refresh();
  }

  if (!mounted) {
    return machine ? (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button size="sm" disabled>
        <Plus className="mr-2 h-4 w-4" />
        Máquina
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {machine ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Máquina
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Editar Máquina" : "Nova Máquina"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-name">Nome *</Label>
            <Input
              id="machine-name"
              name="name"
              required
              defaultValue={machine?.name ?? ""}
              placeholder="Ex: Trator John Deere 6110J"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine-type">Tipo *</Label>
              <Select
                name="type"
                defaultValue={machine?.type ?? "trator"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MACHINE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-ownership">Propriedade *</Label>
              <Select
                name="ownership"
                defaultValue={machine?.ownership ?? "owned"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MACHINE_OWNERSHIP_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine-hourlyRate">R$/Hora</Label>
              <Input
                id="machine-hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={machine?.hourlyRate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-fuelConsumption">Consumo (L/h)</Label>
              <Input
                id="machine-fuelConsumption"
                name="fuelConsumptionLH"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={machine?.fuelConsumptionLH ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine-fuelPrice">R$/Litro Diesel</Label>
              <Input
                id="machine-fuelPrice"
                name="fuelPricePerL"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={machine?.fuelPricePerL ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-maintenance">Manutenção R$/h</Label>
              <Input
                id="machine-maintenance"
                name="maintenanceCostPerH"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={machine?.maintenanceCostPerH ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-notes">Observações</Label>
            <Textarea
              id="machine-notes"
              name="notes"
              rows={2}
              defaultValue={machine?.notes ?? ""}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {machine ? "Salvar" : "Criar Máquina"}
            </Button>
            {machine && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
