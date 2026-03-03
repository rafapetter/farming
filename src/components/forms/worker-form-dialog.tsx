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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { createWorker, updateWorker, deleteWorker } from "@/server/actions/workers";

const ROLE_LABELS: Record<string, string> = {
  trabalhador: "Trabalhador",
  operador: "Operador de Máquina",
  diarista: "Diarista",
  tratorista: "Tratorista",
  other: "Outro",
};

interface WorkerFormDialogProps {
  worker?: {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    dailyRate: string | null;
    hireDate: string | null;
    notes: string | null;
    active: boolean;
  };
}

export function WorkerFormDialog({ worker }: WorkerFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const isEdit = !!worker;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = isEdit
      ? await updateWorker(worker.id, formData)
      : await createWorker(formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!worker || !confirm("Tem certeza que deseja excluir este trabalhador?"))
      return;
    setDeleting(true);
    await deleteWorker(worker.id);
    setDeleting(false);
    setOpen(false);
    router.refresh();
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
            Novo Trabalhador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Trabalhador" : "Novo Trabalhador"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={worker?.name}
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <Select name="role" defaultValue={worker?.role ?? "trabalhador"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyRate">Diária (R$)</Label>
              <Input
                id="dailyRate"
                name="dailyRate"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={worker?.dailyRate ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(62) 99999-9999"
                defaultValue={worker?.phone ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Data de contratação</Label>
              <Input
                id="hireDate"
                name="hireDate"
                type="date"
                defaultValue={worker?.hireDate ?? ""}
              />
            </div>
          </div>

          {isEdit && (
            <input
              type="hidden"
              name="active"
              value={worker.active ? "true" : "false"}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={worker?.notes ?? ""}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
            {isEdit && (
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
