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
import { Plus, Loader2 } from "lucide-react";
import { createField } from "@/server/actions/fields";
import { CoordinateInput } from "./coordinate-input";

export function FieldFormDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coordinates, setCoordinates] = useState<number[][]>([]);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (coordinates.length >= 3) {
      formData.set("coordinates", JSON.stringify(coordinates));
    }
    const result = await createField(formData);

    setLoading(false);
    if (!result || result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <Button size="sm" disabled>
        <Plus className="mr-2 h-4 w-4" />
        Novo Talhão
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Talhão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Talhão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex: Frente da casa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areaHa">Área (hectares)</Label>
            <Input
              id="areaHa"
              name="areaHa"
              type="number"
              step="0.01"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <CoordinateInput onChange={setCoordinates} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar Talhão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
