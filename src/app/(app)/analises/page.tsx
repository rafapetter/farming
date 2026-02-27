"use client";

import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  BarChart3,
  FileQuestion,
  Calculator,
} from "lucide-react";
import { MarkdownMessage, getMessageText } from "@/components/ai/markdown-message";

const ANALYSIS_PROMPTS = [
  {
    id: "overview",
    label: "Resumo Geral",
    icon: BarChart3,
    prompt:
      "Faça um resumo geral completo da situação da Fazenda Primavera. Inclua: status das safras, custos totais (insumos + serviços), pagamentos pendentes, previsão de produtividade, empréstimos e gastos financeiros pessoais. Apresente em formato organizado com tabelas quando possível.",
  },
  {
    id: "missing",
    label: "Dados Faltantes",
    icon: FileQuestion,
    prompt:
      "Analise todos os dados disponíveis e identifique o que está faltando ou incompleto. Verifique: 1) Insumos sem preço ou quantidade, 2) Serviços sem custo, 3) Atividades planejadas sem data, 4) Meses sem lançamento financeiro, 5) Previsão de produtividade incompleta, 6) Talhões sem área definida, 7) Qualquer dado que pareça inconsistente. Liste tudo de forma organizada.",
  },
  {
    id: "suggestions",
    label: "Próximos Passos",
    icon: Lightbulb,
    prompt:
      "Com base em todos os dados da fazenda, sugira os próximos passos mais importantes. Considere: 1) Atividades de manejo que devem ser realizadas em breve, 2) Pagamentos pendentes que precisam ser quitados, 3) Preparação para a colheita, 4) Otimização de custos, 5) Comparação entre cultivares e decisões para próxima safra. Priorize as sugestões por urgência.",
  },
  {
    id: "financial",
    label: "Análise Financeira",
    icon: TrendingUp,
    prompt:
      "Faça uma análise financeira detalhada da fazenda. Inclua: 1) Custo total de produção por hectare (soja e milho), 2) Previsão de receita baseada na produtividade estimada, 3) Ponto de equilíbrio em sacas/ha, 4) Gastos pessoais vs gastos com safra, 5) Empréstimos e impacto no resultado final, 6) Comparação entre receita estimada e custos totais. Use tabelas para organizar os números.",
  },
  {
    id: "calculator",
    label: "Calculadora",
    icon: Calculator,
    prompt:
      "Calcule os seguintes cenários para a safra de soja: 1) Se produtividade for 30 sc/ha a R$128/saca, qual a receita total? 2) Se produtividade for 40 sc/ha a R$128/saca? 3) Qual o custo de produção atual em sc/ha? 4) Qual a produtividade mínima para cobrir os custos? 5) Considerando os empréstimos, qual a produtividade necessária para lucro? Apresente em formato de tabela comparativa.",
  },
];

export default function AnalisesPage() {
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  function runAnalysis(prompt: string, id: string) {
    setActiveAnalysis(id);
    setMessages([]);
    sendMessage({ text: prompt });
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const responseText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage)
    : null;

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ANALYSIS_PROMPTS.map((analysis) => {
          const Icon = analysis.icon;
          const isActive = activeAnalysis === analysis.id;
          return (
            <Card
              key={analysis.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                isActive ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => runAnalysis(analysis.prompt, analysis.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
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
                  <p className="font-medium text-sm">{analysis.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {analysis.id === "overview" && "Visão geral de todos os dados"}
                    {analysis.id === "missing" && "Identificar dados incompletos"}
                    {analysis.id === "suggestions" && "Recomendações prioritárias"}
                    {analysis.id === "financial" && "Custos, receitas e projeções"}
                    {analysis.id === "calculator" && "Cenários de produtividade"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results */}
      {(isLoading || responseText) && (
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

      {/* Tip when nothing selected */}
      {!activeAnalysis && (
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
