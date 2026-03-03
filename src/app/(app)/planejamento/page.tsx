"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Sprout,
  DollarSign,
  TrendingUp,
  Leaf,
  Wallet,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { MarkdownMessage } from "@/components/ai/markdown-message";

interface TabState {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

const STORAGE_KEY = "fazenda-planejamento";

function loadCache(): Record<string, { content: string; timestamp: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(id: string, content: string) {
  try {
    const cache = loadCache();
    cache[id] = { content, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

const SECTIONS = [
  {
    id: "safra",
    label: "Próxima Safra",
    icon: Sprout,
    prompt: `Faça uma análise completa para o PLANEJAMENTO DA PRÓXIMA SAFRA da fazenda, considerando:

1. **Custos estimados de insumos** baseados nos gastos das safras anteriores, com ajuste de inflação
2. **Receita projetada** usando os preços atuais de commodities
3. **Análise de break-even** (ponto de equilíbrio em sacas/ha)
4. **Recomendação de área plantada** considerando financiamento disponível
5. **Comparação soja vs milho** para a próxima safra: qual cultura tende a dar melhor retorno?
6. **Cronograma sugerido** de atividades

Base todas as projeções nos dados reais da fazenda. Use preços de mercado atuais quando disponíveis.`,
  },
  {
    id: "financeiro",
    label: "Saúde Financeira",
    icon: DollarSign,
    prompt: `Analise a SAÚDE FINANCEIRA completa da fazenda:

1. **Posição patrimonial**: Estime o valor dos ativos (terra, safra armazenada, equipamentos implícitos)
2. **Passivos**: Empréstimos ativos, pagamentos pendentes, adiantamentos
3. **Fluxo de caixa**: Projeção para os próximos 6 meses baseado no histórico de receitas e despesas
4. **Orçamento vs realizado**: Compare gastos por categoria com o que seria esperado
5. **Limite seguro de retirada pessoal**: Com base na receita líquida projetada menos necessidades de reinvestimento, qual o valor mensal seguro para retirada pessoal do proprietário?
6. **Score de saúde financeira**: De 1-10, com justificativa

Seja específico com números reais da fazenda.`,
  },
  {
    id: "investimentos",
    label: "Investimentos",
    icon: TrendingUp,
    prompt: `Analise possíveis INVESTIMENTOS para a fazenda:

1. **Cenários de expansão**: O que aconteceria se expandir a área plantada em 25%, 50%, 100%?
2. **Equipamentos**: Avalie se vale a pena investir em maquinário próprio vs terceirizar
3. **Irrigação**: Análise de viabilidade de sistema de irrigação para a fazenda
4. **Armazenagem**: Vale a pena ter silo próprio para melhorar negociação de preço?
5. **ROI de cada investimento**: Tempo de retorno e impacto no resultado

Considere os custos e receitas atuais da fazenda para projetar retornos realistas.`,
  },
  {
    id: "culturas",
    label: "Culturas Alternativas",
    icon: Leaf,
    prompt: `Faça uma avaliação de CULTURAS ALTERNATIVAS para a fazenda, considerando a localização (Goiás), clima, e infraestrutura existente:

1. **Soja** (cultura atual): Projeção de rentabilidade
2. **Milho safrinha**: Viabilidade como segunda safra após soja
3. **Algodão**: Análise de rentabilidade vs complexidade
4. **Sorgo**: Como alternativa de baixo custo
5. **Feijão**: Viabilidade e mercado regional
6. **Girassol**: Como rotação de cultura

Para cada cultura avalie:
- Receita estimada por hectare (R$/ha)
- Custo estimado por hectare (R$/ha)
- Margem líquida estimada
- Risco (baixo/médio/alto) — volatilidade de preço, dependência climática
- Complexidade operacional
- Mercado na região

Ordene as culturas por melhor relação retorno/risco.`,
  },
  {
    id: "orcamento",
    label: "Orçamento",
    icon: Wallet,
    prompt: `Crie um PLANO ORÇAMENTÁRIO detalhado para a fazenda:

1. **Orçamento anual por categoria**: Baseado nos gastos históricos, projete um orçamento mensal para:
   - Insumos (sementes, fertilizantes, defensivos)
   - Serviços (mão de obra, maquinário)
   - Manutenção
   - Administrativo
   - Financeiro (juros, parcelas)

2. **Limites de gastos**: Para cada categoria, sugira um limite mensal e anual
3. **Alertas**: Em que percentual do limite devemos alertar (70%? 80%?)
4. **Reserva de emergência**: Quanto manter como reserva para imprevistos
5. **Projeção de resultado**: Receita - Custos = Resultado líquido projetado

Use valores realistas baseados nos dados da fazenda.`,
  },
];

export default function PlanejamentoPage() {
  const [activeTab, setActiveTab] = useState("safra");
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  const [cachedTimestamp, setCachedTimestamp] = useState<number | undefined>();
  const abortControllers = useRef<Record<string, AbortController>>({});

  // Load cached content for initial tab on mount
  useEffect(() => {
    const cache = loadCache();
    for (const section of SECTIONS) {
      const cached = cache[section.id];
      if (cached) {
        setTabStates((prev) => ({
          ...prev,
          [section.id]: {
            content: cached.content,
            isStreaming: false,
            error: null,
          },
        }));
      }
    }
    // Set timestamp for the initial active tab
    setCachedTimestamp(cache["safra"]?.timestamp);
  }, []);

  // Update cached timestamp when switching tabs
  useEffect(() => {
    const cache = loadCache();
    setCachedTimestamp(cache[activeTab]?.timestamp);
  }, [activeTab]);

  const generateForTab = useCallback(
    async (tabId: string) => {
      // Abort any existing request for this tab
      abortControllers.current[tabId]?.abort();
      const controller = new AbortController();
      abortControllers.current[tabId] = controller;

      setTabStates((prev) => ({
        ...prev,
        [tabId]: { content: "", isStreaming: true, error: null },
      }));

      const section = SECTIONS.find((s) => s.id === tabId);
      if (!section) return;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "analysis",
            messages: [
              {
                id: `planning-${tabId}`,
                role: "user",
                parts: [{ type: "text", text: section.prompt }],
              },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text().catch(() => "");
          console.error(
            `Analysis API error: ${response.status}`,
            errorText
          );
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setTabStates((prev) => ({
            ...prev,
            [tabId]: { content: accumulated, isStreaming: true, error: null },
          }));
        }

        // Done streaming
        setTabStates((prev) => ({
          ...prev,
          [tabId]: {
            content: accumulated || "Análise não gerou conteúdo. Tente novamente.",
            isStreaming: false,
            error: null,
          },
        }));

        // Cache result if there's content
        if (accumulated) {
          saveCache(tabId, accumulated);
          setCachedTimestamp(Date.now());
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Analysis generation error:", error);
        setTabStates((prev) => ({
          ...prev,
          [tabId]: {
            content: prev[tabId]?.content ?? "",
            isStreaming: false,
            error: "Erro ao gerar análise. Tente novamente.",
          },
        }));
      }
    },
    []
  );

  const currentSection = SECTIONS.find((s) => s.id === activeTab);
  const currentState = tabStates[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planejamento</h1>
          <p className="text-muted-foreground">
            Análises e planejamento estratégico com IA
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b pb-px">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeTab === section.id;
          const isStreaming = tabStates[section.id]?.isStreaming;
          const hasContent = !!tabStates[section.id]?.content;

          return (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {isStreaming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {section.label}
              {hasContent && !isStreaming && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {currentSection && (
                <>
                  <currentSection.icon className="h-4 w-4" />
                  {currentSection.label}
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {cachedTimestamp && !currentState?.isStreaming && (
                <span className="text-xs text-muted-foreground">
                  {timeAgo(cachedTimestamp)}
                </span>
              )}
              <Button
                size="sm"
                onClick={() => generateForTab(activeTab)}
                disabled={currentState?.isStreaming}
              >
                {currentState?.isStreaming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : currentState?.content ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Target className="mr-2 h-4 w-4" />
                )}
                {currentState?.isStreaming
                  ? "Gerando..."
                  : currentState?.content
                    ? "Regenerar"
                    : "Gerar Análise"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentState?.error && (
            <p className="text-sm text-destructive mb-4">
              {currentState.error}
            </p>
          )}

          {currentState?.content ? (
            <MarkdownMessage
              content={currentState.content}
              isStreaming={currentState.isStreaming}
            />
          ) : currentState?.isStreaming ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Consultando dados da fazenda e gerando análise...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground max-w-md">
                Clique em &quot;Gerar Análise&quot; para que a IA analise todos
                os dados da fazenda e gere recomendações para{" "}
                {currentSection?.label.toLowerCase()}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
