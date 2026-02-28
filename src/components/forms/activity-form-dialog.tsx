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
import { Plus, Loader2, Trash2 } from "lucide-react";
import {
  createActivity,
  updateActivity,
  deleteActivity,
} from "@/server/actions/activities";
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
} from "@/lib/constants";

export interface ActivityData {
  id: string;
  title: string;
  activityType: string;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  quantity: string | null;
  observations: string | null;
}

interface ActivityFormDialogProps {
  seasonId: string;
  activity?: ActivityData;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ActivityFormDialog({
  seasonId,
  activity,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ActivityFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const isEdit = !!activity;
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (isEdit) {
      const result = await updateActivity(activity.id, seasonId, formData);
      setLoading(false);
      if (!result || result.success) {
        setOpen(false);
        router.refresh();
      }
    } else {
      const result = await createActivity(seasonId, formData);
      setLoading(false);
      if (!result || result.success) {
        setOpen(false);
        router.refresh();
      }
    }
  }

  async function handleDelete() {
    if (!activity) return;
    setDeleting(true);
    await deleteActivity(activity.id, seasonId);
    setDeleting(false);
    setOpen(false);
    router.refresh();
  }

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Editar Atividade" : "Nova Atividade"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={activity?.title ?? ""}
            placeholder="Ex: Pulverização de herbicida"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="activityType">Tipo</Label>
            <Select
              name="activityType"
              defaultValue={activity?.activityType ?? "other"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={activity?.status ?? "planned"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_STATUS_LABELS).map(
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
            <Label htmlFor="scheduledDate">Data Programada</Label>
            <Input
              id="scheduledDate"
              name="scheduledDate"
              type="date"
              defaultValue={activity?.scheduledDate ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="completedDate">Data Conclusão</Label>
            <Input
              id="completedDate"
              name="completedDate"
              type="date"
              defaultValue={activity?.completedDate ?? ""}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade/Dose</Label>
          <Input
            id="quantity"
            name="quantity"
            defaultValue={activity?.quantity ?? ""}
            placeholder="Ex: 3L/ha"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            name="observations"
            rows={3}
            defaultValue={activity?.observations ?? ""}
            placeholder="Detalhes da atividade..."
          />
        </div>

        <div className="flex gap-2">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting || loading}
              onClick={handleDelete}
            >
              {deleting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3.5 w-3.5" />
              )}
              Excluir
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1"
            disabled={loading || deleting}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isEdit ? "Salvar Alterações" : "Salvar Atividade"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (trigger || (!isEdit && !controlledOpen)) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Atividade
            </Button>
          )}
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
