"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  BarChart3,
  FileQuestion,
  Calculator,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MarkdownMessage, getMessageText } from "@/components/ai/markdown-message";

interface AnalysisResult {
  id: string;
  label: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEY = "fazenda-analises";

function loadCachedResults(): Record<string, AnalysisResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCachedResults(results: Record<string, AnalysisResult>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    // storage full or unavailable
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

const ANALYSIS_PROMPTS = [
  {
    id: "overview",
    label: "Resumo Geral",
    icon: BarChart3,
    description: "Visão geral de todos os dados",
    prompt:
      "Faça um resumo geral completo da situação da Fazenda Primavera. Inclua: status das safras, custos totais (insumos + serviços), pagamentos pendentes, previsão de produtividade, empréstimos e gastos financeiros pessoais. Apresente em formato organizado com tabelas quando possível.",
  },
  {
    id: "missing",
    label: "Dados Faltantes",
    icon: FileQuestion,
    description: "Identificar dados incompletos",
    prompt:
      "Analise todos os dados disponíveis e identifique o que está faltando ou incompleto. Verifique: 1) Insumos sem preço ou quantidade, 2) Serviços sem custo, 3) Atividades planejadas sem data, 4) Meses sem lançamento financeiro, 5) Previsão de produtividade incompleta, 6) Talhões sem área definida, 7) Qualquer dado que pareça inconsistente. Liste tudo de forma organizada.",
  },
  {
    id: "suggestions",
    label: "Próximos Passos",
    icon: Lightbulb,
    description: "Recomendações prioritárias",
    prompt:
      "Com base em todos os dados da fazenda, sugira os próximos passos mais importantes. Considere: 1) Atividades de manejo que devem ser realizadas em breve, 2) Pagamentos pendentes que precisam ser quitados, 3) Preparação para a colheita, 4) Otimização de custos, 5) Comparação entre cultivares e decisões para próxima safra. Priorize as sugestões por urgência.",
  },
  {
    id: "financial",
    label: "Análise Financeira",
    icon: TrendingUp,
    description: "Custos, receitas e projeções",
    prompt:
      "Faça uma análise financeira detalhada da fazenda. Inclua: 1) Custo total de produção por hectare (soja e milho), 2) Previsão de receita baseada na produtividade estimada, 3) Ponto de equilíbrio em sacas/ha, 4) Gastos pessoais vs gastos com safra, 5) Empréstimos e impacto no resultado final, 6) Comparação entre receita estimada e custos totais. Use tabelas para organizar os números.",
  },
  {
    id: "calculator",
    label: "Cenários",
    icon: Calculator,
    description: "Cenários de produtividade",
    prompt:
      "Calcule os seguintes cenários para a safra de soja (35,8 ha): 1) Se produtividade for 30 sc/ha a R$110/saca, qual a receita total? 2) Se produtividade for 50 sc/ha a R$110/saca? 3) Se produtividade for 60 sc/ha a R$110/saca? 4) Qual o custo de produção atual em sc/ha? 5) Qual a produtividade mínima para cobrir os custos? 6) Considerando os empréstimos, qual a produtividade necessária para lucro? Apresente em formato de tabela comparativa.",
  },
];

export default function AnalisesPage() {
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [expandedCached, setExpandedCached] = useState<string | null>(null);
  const [cachedResults, setCachedResults] = useState<Record<string, AnalysisResult>>({});

  useEffect(() => {
    setCachedResults(loadCachedResults());
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const responseText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage)
    : null;

  // Save completed analysis to cache
  useEffect(() => {
    if (activeAnalysis && responseText && !isLoading) {
      const analysis = ANALYSIS_PROMPTS.find((a) => a.id === activeAnalysis);
      if (analysis) {
        const updated = {
          ...cachedResults,
          [activeAnalysis]: {
            id: activeAnalysis,
            label: analysis.label,
            content: responseText,
            timestamp: Date.now(),
          },
        };
        setCachedResults(updated);
        saveCachedResults(updated);
      }
    }
  }, [responseText, isLoading, activeAnalysis]);

  const runAnalysis = useCallback(
    (prompt: string, id: string) => {
      setActiveAnalysis(id);
      setExpandedCached(null);
      setMessages([]);
      sendMessage({ text: prompt });
    },
    [setMessages, sendMessage]
  );

  // Analyses that have cached results (sorted by most recent)
  const cachedList = ANALYSIS_PROMPTS.filter((a) => cachedResults[a.id])
    .sort(
      (a, b) =>
        (cachedResults[b.id]?.timestamp ?? 0) -
        (cachedResults[a.id]?.timestamp ?? 0)
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Análises & Sugestões IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Avaliação inteligente dos dados da fazenda com recomendações
        </p>
      </div>

      {/* Analysis Action Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {ANALYSIS_PROMPTS.map((analysis) => {
          const Icon = analysis.icon;
          const isActive = activeAnalysis === analysis.id && (isLoading || responseText);
          const hasCached = !!cachedResults[analysis.id];
          return (
            <Card
              key={analysis.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                isActive ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => runAnalysis(analysis.prompt, analysis.id)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-3 sm:p-4 text-center">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-xs sm:text-sm">{analysis.label}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {analysis.description}
                  </p>
                  {hasCached && (
                    <p className="text-xs text-primary mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(cachedResults[analysis.id]!.timestamp)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Analysis Results */}
      {(isLoading || (responseText && activeAnalysis)) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  {ANALYSIS_PROMPTS.find((a) => a.id === activeAnalysis)
                    ?.label ?? "Análise"}
                </CardTitle>
              </div>
              {!isLoading && activeAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    runAnalysis(
                      ANALYSIS_PROMPTS.find((a) => a.id === activeAnalysis)!
                        .prompt,
                      activeAnalysis
                    )
                  }
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Atualizar
                </Button>
              )}
            </div>
            <CardDescription>
              Gemini 3.0 Flash - Análise baseada nos dados reais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !responseText ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analisando dados da fazenda...
                </p>
              </div>
            ) : responseText ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownMessage content={responseText} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Cached Previous Results */}
      {cachedList.length > 0 && !isLoading && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Análises Recentes
          </h2>
          {cachedList
            .filter((a) => a.id !== activeAnalysis || !responseText)
            .map((analysis) => {
              const cached = cachedResults[analysis.id]!;
              const isExpanded = expandedCached === analysis.id;
              const Icon = analysis.icon;
              return (
                <Card key={analysis.id}>
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setExpandedCached(isExpanded ? null : analysis.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">
                          {analysis.label}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(cached.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            runAnalysis(analysis.prompt, analysis.id);
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownMessage content={cached.content} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>
      )}

      {/* Tip when nothing selected and no cache */}
      {!activeAnalysis && cachedList.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">Selecione uma análise</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Clique em uma das opções acima para que a IA analise os dados da
              fazenda e gere insights, sugestões e relatórios personalizados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
