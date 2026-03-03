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
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2, Trash2 } from "lucide-react";
import { updateField, deleteField } from "@/server/actions/fields";
import { CoordinateInput } from "./coordinate-input";

interface FieldEditDialogProps {
  field: {
    id: string;
    name: string;
    areaHa: string | null;
    notes: string | null;
    coordinates?: unknown;
  };
}

export function FieldEditDialog({ field }: FieldEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coordinates, setCoordinates] = useState<number[][]>(
    Array.isArray(field.coordinates)
      ? (field.coordinates as number[][])
      : []
  );
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (coordinates.length >= 3) {
      formData.set("coordinates", JSON.stringify(coordinates));
    }
    const result = await updateField(field.id, formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este talhão?")) return;
    setDeleting(true);
    await deleteField(field.id);
    setDeleting(false);
    setOpen(false);
    router.refresh();
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Talhão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input
              id="edit-name"
              name="name"
              required
              defaultValue={field.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-areaHa">Área (hectares)</Label>
            <Input
              id="edit-areaHa"
              name="areaHa"
              type="number"
              step="0.01"
              placeholder="0,00"
              defaultValue={field.areaHa ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              name="notes"
              rows={3}
              defaultValue={field.notes ?? ""}
            />
          </div>

          <CoordinateInput
            initialCoordinates={
              Array.isArray(field.coordinates)
                ? (field.coordinates as number[][])
                : undefined
            }
            onChange={setCoordinates}
          />

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
