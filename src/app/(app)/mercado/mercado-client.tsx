"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Sparkles,
  Search,
} from "lucide-react";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { MarkdownMessage } from "@/components/ai/markdown-message";
import { createBuyer, updateBuyer, deleteBuyer } from "@/server/actions/buyers";
import { uploadNotaFiscal, confirmNotaFiscal } from "@/server/actions/notas-fiscais";

interface MercadoClientProps {
  farmId: string;
  chartData: Array<{
    date: string;
    soy?: number;
    corn?: number;
    soyCbot?: number;
    cornCbot?: number;
  }>;
  latestPrices: {
    soyCepea?: number;
    cornCepea?: number;
    soyCbot?: number;
    cornCbot?: number;
  };
  buyers: Array<{
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    commodities: unknown;
    lastContactDate: string | null;
    notes: string | null;
    active: boolean;
  }>;
}

type Tab = "precos" | "compradores" | "nf";

export function MercadoClient({
  farmId,
  chartData,
  latestPrices,
  buyers,
}: MercadoClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("precos");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/cron/daily");
      router.refresh();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "precos", label: "Cotações" },
    { id: "compradores", label: "Compradores" },
    { id: "nf", label: "Notas Fiscais" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mercado</h1>
          <p className="text-muted-foreground">
            Cotações, compradores e notas fiscais
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshPrices}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar Preços
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "precos" && (
        <PricesTab
          chartData={chartData}
          latestPrices={latestPrices}
        />
      )}

      {activeTab === "compradores" && (
        <BuyersTab farmId={farmId} buyers={buyers} />
      )}

      {activeTab === "nf" && <NotasFiscaisTab farmId={farmId} />}
    </div>
  );
}

// ─── Prices Tab ─────────────────────────────────────────────────────────────

function PricesTab({
  chartData,
  latestPrices,
}: {
  chartData: MercadoClientProps["chartData"];
  latestPrices: MercadoClientProps["latestPrices"];
}) {
  const hasPrices =
    latestPrices.soyCepea ||
    latestPrices.cornCepea ||
    latestPrices.soyCbot ||
    latestPrices.cornCbot;

  return (
    <div className="space-y-4">
      {/* Price cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <PriceCard
          label="Soja CEPEA"
          price={latestPrices.soyCepea}
          unit="R$/saca"
          color="text-green-600"
        />
        <PriceCard
          label="Milho CEPEA"
          price={latestPrices.cornCepea}
          unit="R$/saca"
          color="text-yellow-600"
        />
        <PriceCard
          label="Soja CBOT"
          price={latestPrices.soyCbot}
          unit="R$/saca"
          color="text-green-600"
        />
        <PriceCard
          label="Milho CBOT"
          price={latestPrices.cornCbot}
          unit="R$/saca"
          color="text-yellow-600"
        />
      </div>

      {/* Price chart */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Histórico de Preços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriceHistoryChart data={chartData} showCbot />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum dado de preço disponível ainda. Clique em &quot;Atualizar
              Preços&quot; para buscar cotações.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriceCard({
  label,
  price,
  unit,
  color,
}: {
  label: string;
  price?: number;
  unit: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {price ? (
          <p className={`text-xl font-bold ${color}`}>
            R$ {price.toFixed(2)}
          </p>
        ) : (
          <p className="text-xl font-bold text-muted-foreground/50">—</p>
        )}
        <p className="text-xs text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );
}

// ─── Buyers Tab ─────────────────────────────────────────────────────────────

function BuyersTab({
  farmId,
  buyers,
}: {
  farmId: string;
  buyers: MercadoClientProps["buyers"];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<
    MercadoClientProps["buyers"][number] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [showAiSearch, setShowAiSearch] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("farmId", farmId);

    if (editingBuyer) {
      await updateBuyer(editingBuyer.id, formData);
    } else {
      await createBuyer(formData);
    }

    setLoading(false);
    setDialogOpen(false);
    setEditingBuyer(null);
    router.refresh();
  };

  const handleDelete = async (buyerId: string) => {
    if (!confirm("Excluir este comprador?")) return;
    await deleteBuyer(buyerId);
    router.refresh();
  };

  const handleAiSearch = async () => {
    setAiSearching(true);
    setAiResult("");
    setShowAiSearch(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analysis",
          messages: [
            {
              id: "buyer-search",
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Busque e sugira potenciais compradores de soja e milho para a Fazenda Primavera (Goiás, Brasil).

Considere:
1. **Tradings e exportadoras** que operam no estado de Goiás (ex: Cargill, Bunge, ADM, Louis Dreyfus, COFCO, Amaggi, etc.) — inclua unidades/armazéns na região
2. **Cooperativas agrícolas** da região de Goiás que compram grãos
3. **Indústrias processadoras** de soja e milho na região (esmagadoras, fábricas de ração, etc.)
4. **Compradores locais** e intermediários regionais
5. **Canais digitais** e plataformas de comercialização de grãos (ex: Farmbox, Agrinvest, etc.)

Para cada sugestão, forneça:
- Nome da empresa/comprador
- Tipo (trading, cooperativa, indústria, intermediário)
- Localização/região
- Commodities que compra (soja, milho, ou ambos)
- Contato ou como encontrá-los (site, telefone geral se público)
- Vantagens e desvantagens de negociar com cada um

Organize por relevância para uma fazenda de ~39 hectares em Goiás. Priorize opções que ofereçam boas condições para pequenos/médios produtores.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiResult(accumulated);
      }

      setAiSearching(false);
    } catch {
      setAiResult("Erro ao buscar compradores. Tente novamente.");
      setAiSearching(false);
    }
  };

  const activeBuyers = buyers.filter((b) => b.active);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAiSearch}
          disabled={aiSearching}
        >
          {aiSearching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {aiSearching ? "Buscando..." : "Buscar com IA"}
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingBuyer(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Comprador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBuyer ? "Editar Comprador" : "Novo Comprador"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingBuyer?.name ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    name="company"
                    defaultValue={editingBuyer?.company ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localidade</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={editingBuyer?.location ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingBuyer?.phone ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingBuyer?.email ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commodities">
                  Commodities (separadas por vírgula)
                </Label>
                <Input
                  id="commodities"
                  name="commodities"
                  placeholder="soja, milho"
                  defaultValue={
                    editingBuyer?.commodities
                      ? (editingBuyer.commodities as string[]).join(", ")
                      : "soja"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  name="notes"
                  defaultValue={editingBuyer?.notes ?? ""}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingBuyer ? "Salvar" : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Search Results */}
      {showAiSearch && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Sugestões de Compradores (IA)
              </CardTitle>
              {!aiSearching && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAiSearch(false)}
                >
                  Fechar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {aiResult ? (
              <MarkdownMessage content={aiResult} isStreaming={aiSearching} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando compradores na região...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeBuyers.length === 0 && !showAiSearch ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              Nenhum comprador cadastrado ainda. Use &quot;Buscar com IA&quot;
              para encontrar compradores na região.
            </p>
          </CardContent>
        </Card>
      ) : activeBuyers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeBuyers.map((buyer) => (
            <Card key={buyer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{buyer.name}</CardTitle>
                    {buyer.company && (
                      <p className="text-xs text-muted-foreground">
                        {buyer.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingBuyer(buyer);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(buyer.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {buyer.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{buyer.location}</span>
                  </div>
                )}
                {buyer.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${buyer.phone}`} className="hover:underline">
                      {buyer.phone}
                    </a>
                  </div>
                )}
                {buyer.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <a
                      href={`mailto:${buyer.email}`}
                      className="hover:underline"
                    >
                      {buyer.email}
                    </a>
                  </div>
                )}
                {Array.isArray(buyer.commodities) ? (
                  <div className="flex gap-1 pt-1">
                    {(buyer.commodities as string[]).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {buyer.notes && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {buyer.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Notas Fiscais Tab ──────────────────────────────────────────────────────

function NotasFiscaisTab({ farmId }: { farmId: string }) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [nfId, setNfId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setExtractedData(null);
    setResult(null);

    const formData = new FormData();
    formData.set("file", file);

    const res = await uploadNotaFiscal(formData);
    setUploading(false);

    if (res && "data" in res && res.data) {
      setExtractedData(res.data);
      setNfId(res.nfId ?? null);
    } else if (res && "error" in res) {
      setResult(`Erro: ${res.error}`);
    }
  };

  const handleConfirm = async (seasonId: string) => {
    if (!nfId) return;
    setConfirming(true);
    const res = await confirmNotaFiscal(nfId, seasonId);
    setConfirming(false);

    if (res && "success" in res) {
      setResult(
        `${res.itemsCreated} insumos criados com sucesso!`
      );
      setExtractedData(null);
      setNfId(null);
      router.refresh();
    } else if (res && "error" in res) {
      setResult(`Erro: ${res.error}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload de Nota Fiscal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie uma foto ou PDF de uma nota fiscal. A IA irá extrair os
            dados automaticamente para criar registros de insumos.
          </p>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Processando..." : "Escolher arquivo"}
              </div>
            </label>
          </div>

          {result && (
            <p
              className={`text-sm font-medium ${result.startsWith("Erro") ? "text-destructive" : "text-green-600"}`}
            >
              {result}
            </p>
          )}

          {/* Extracted data preview */}
          {extractedData && (
            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="text-sm font-medium">Dados Extraídos</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Fornecedor:</span>{" "}
                  {extractedData.supplier}
                </div>
                <div>
                  <span className="text-muted-foreground">NF:</span>{" "}
                  {extractedData.nfNumber}
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>{" "}
                  {extractedData.date}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span> R${" "}
                  {extractedData.total?.toFixed(2)}
                </div>
              </div>

              {extractedData.items?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-2 py-1">Produto</th>
                        <th className="text-left px-2 py-1">Categoria</th>
                        <th className="text-right px-2 py-1">Qtd</th>
                        <th className="text-right px-2 py-1">Preço Un.</th>
                        <th className="text-right px-2 py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.items.map(
                        (item: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">{item.name}</td>
                            <td className="px-2 py-1">{item.category}</td>
                            <td className="px-2 py-1 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-2 py-1 text-right">
                              R$ {item.unitPrice?.toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right font-medium">
                              R$ {item.totalPrice?.toFixed(2)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Para confirmar e criar os insumos, será necessário vincular a
                uma safra na página da safra.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
