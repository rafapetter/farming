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
import { Plus, Loader2 } from "lucide-react";
import { createConsultingVisit } from "@/server/actions/consulting";

export function ConsultingFormDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createConsultingVisit(formData);

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
          Nova Visita
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Visita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visitDate">Data da Visita *</Label>
            <Input id="visitDate" name="visitDate" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activities">Atividades Realizadas *</Label>
            <Textarea
              id="activities"
              name="activities"
              required
              rows={6}
              placeholder="Descreva as atividades realizadas na visita..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recomendações</Label>
            <Textarea
              id="recommendations"
              name="recommendations"
              rows={4}
              placeholder="Recomendações e próximos passos..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar Visita
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
