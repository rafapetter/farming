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
import { createYieldAssessment } from "@/server/actions/yield";

export function YieldFormDialog({ seasonId }: { seasonId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createYieldAssessment(seasonId, formData);

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
          Nova Avaliação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Avaliação de Produtividade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cultivarName">Nome do Cultivar</Label>
            <Input
              id="cultivarName"
              name="cultivarName"
              placeholder="Ex: Lote A"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Dados da Planta</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight1000GrainsKg">PMG (kg)</Label>
                <Input
                  id="weight1000GrainsKg"
                  name="weight1000GrainsKg"
                  type="number"
                  step="0.0001"
                  placeholder="0,2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rowSpacingM">Espaçamento (m)</Label>
                <Input
                  id="rowSpacingM"
                  name="rowSpacingM"
                  type="number"
                  step="0.01"
                  placeholder="0,50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plantsPerLinearM">Plantas/m linear</Label>
                <Input
                  id="plantsPerLinearM"
                  name="plantsPerLinearM"
                  type="number"
                  step="0.01"
                  placeholder="12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plantPopulationHa">População/ha</Label>
                <Input
                  id="plantPopulationHa"
                  name="plantPopulationHa"
                  type="number"
                  placeholder="240000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avgPodsPerPlant">Média vagens/planta</Label>
                <Input
                  id="avgPodsPerPlant"
                  name="avgPodsPerPlant"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avgGrainsPerPod">Média grãos/vagem</Label>
                <Input
                  id="avgGrainsPerPod"
                  name="avgGrainsPerPod"
                  type="number"
                  step="0.0001"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Contagem de Vagens</h3>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="space-y-2">
                  <Label htmlFor={`pods${n}Grain${n > 1 ? "s" : ""}`}>
                    {n} grão{n > 1 ? "s" : ""}
                  </Label>
                  <Input
                    id={`pods${n}Grain${n > 1 ? "s" : ""}`}
                    name={`pods${n}Grain${n > 1 ? "s" : ""}`}
                    type="number"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Resultados Calculados</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avgGrainsPerPlant">Grãos/planta</Label>
                <Input
                  id="avgGrainsPerPlant"
                  name="avgGrainsPerPlant"
                  type="number"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grainsPerM2">Grãos/m²</Label>
                <Input
                  id="grainsPerM2"
                  name="grainsPerM2"
                  type="number"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gramsPerPlant">Gramas/planta</Label>
                <Input
                  id="gramsPerPlant"
                  name="gramsPerPlant"
                  type="number"
                  step="0.0001"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kgPerHa">kg/ha</Label>
                <Input
                  id="kgPerHa"
                  name="kgPerHa"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sacksPerHa">Sacas/ha</Label>
                <Input
                  id="sacksPerHa"
                  name="sacksPerHa"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedLossPct">Perdas (%)</Label>
                <Input
                  id="estimatedLossPct"
                  name="estimatedLossPct"
                  type="number"
                  step="0.01"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Dados Financeiros</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerSack">Preço/saca (R$)</Label>
                <Input
                  id="pricePerSack"
                  name="pricePerSack"
                  type="number"
                  step="0.01"
                  placeholder="128,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productionCostSacks">Custo (sacas/ha)</Label>
                <Input
                  id="productionCostSacks"
                  name="productionCostSacks"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar Avaliação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
