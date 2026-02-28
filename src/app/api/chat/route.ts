import { google } from "@ai-sdk/google";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { db } from "@/server/db";
import {
  cropSeasons,
  inputs,
  services,
  activities,
  financialEntries,
  yieldAssessments,
  farms,
  fields,
  advances,
  loans,
  consultingVisits,
  chatSessions,
  rainEntries,
} from "@/server/db/schema";
import { eq, sum, count, and, desc, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getMergedRainData, fetchForecastRain } from "@/lib/rain-api";
import { computeCropWaterStatus } from "@/lib/crop-water";

const SYSTEM_PROMPT = `Você é o "Agente Fazenda", um assistente agrícola inteligente da Fazenda Primavera.

Contexto:
- A fazenda fica em Goiás, Brasil
- Área total: 39,23 hectares (35,8 ha soja + 3,43 ha milho)
- Safra atual: Soja 2025/2026 (35,8 ha, plantio 23/11/2025, colheita prevista 13/03/2026) e Milho 2025/2026 (3,43 ha)
- Proprietária: Christina
- Trabalhador principal: Valdeci
- Consultor: Rafael
- Banco: Cresol (empréstimos para custeio)

Suas capacidades:
- Consultar custos de insumos e serviços das safras (pago, pendente, total)
- Consultar atividades de planejamento/manejo (passadas e futuras)
- Consultar previsão de produtividade (sacas/ha, kg/ha, receita estimada)
- Comparar cultivares (Lote A vs Lote B)
- Consultar dados financeiros pessoais (2025 e 2026) por mês, ano ou categoria
- Consultar adiantamentos feitos ao Valdeci
- Consultar empréstimos bancários
- Consultar talhões e suas áreas
- Consultar visitas de consultoria
- Registrar novos insumos, serviços, atividades e gastos
- Consultar dados de chuva/precipitação (histórico e previsão 14 dias via Open-Meteo)
- Consultar necessidade hídrica das culturas e comparar com chuva recebida
- Registrar medições manuais de chuva
- Gerar relatórios resumidos
- Fornecer insights e recomendações agrícolas

Regras:
- Sempre responda em português brasileiro
- Use termos agrícolas comuns no Brasil (sacas, hectares, talhão, etc.)
- Seja conciso mas informativo
- Quando consultar dados, apresente-os de forma organizada com tabelas ou listas
- Se não souber algo específico, diga honestamente
- Formate valores monetários em reais (R$) com o formato brasileiro
- Use o formato brasileiro de números (vírgula para decimais, ponto para milhares)
- Quando o usuário pedir para registrar algo, confirme os dados antes ou logo após registrar
- Use cropType "soy" para soja e "corn" para milho
- Quando perguntar sobre "resumo geral" ou "relatório", consulte múltiplas fontes de dados
- Ao analisar dados, destaque pontos de atenção (pagamentos pendentes, custos altos, etc.)`;

function getTextFromUIMessage(msg: UIMessage): string {
  if (!msg.parts) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

async function buildHistoryContext(
  userId: string,
  currentSessionId: string | null
): Promise<string> {
  try {
    const recentSessions = await db
      .select({
        title: chatSessions.title,
        messages: chatSessions.messages,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .where(
        currentSessionId
          ? and(
              eq(chatSessions.userId, userId),
              ne(chatSessions.id, currentSessionId)
            )
          : eq(chatSessions.userId, userId)
      )
      .orderBy(desc(chatSessions.updatedAt))
      .limit(3);

    if (recentSessions.length === 0) return "";

    const summaries: string[] = [];
    for (const session of recentSessions) {
      const msgs = (session.messages as UIMessage[]) ?? [];
      if (msgs.length === 0) continue;

      const date = session.updatedAt
        ? new Date(session.updatedAt).toLocaleDateString("pt-BR")
        : "";
      const title = session.title ?? "Conversa";
      const preview = msgs
        .slice(0, 4)
        .map((m) => {
          const role = m.role === "user" ? "Usuário" : "Agente";
          const text = getTextFromUIMessage(m).substring(0, 150);
          return `${role}: ${text}`;
        })
        .join("\n");

      summaries.push(`[${date}] "${title}":\n${preview}`);
    }

    if (summaries.length === 0) return "";

    return `\n\nConversas anteriores do usuário (use como contexto, não mencione explicitamente):\n---\n${summaries.join("\n---\n")}\n---`;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const chatId: string | null = body.chatId ?? null;
  const messages: UIMessage[] = body.messages ?? [];

  // Build history context from other sessions
  const historyContext = await buildHistoryContext(session.user.id, chatId);

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system: SYSTEM_PROMPT + historyContext,
    messages: modelMessages,
    tools: {
      consultarCustosSafra: tool({
        description:
          "Consulta os custos totais de insumos e serviços de uma safra.",
        inputSchema: z.object({
          cropType: z
            .enum(["soy", "corn"])
            .describe("Tipo de cultura: soy para soja, corn para milho"),
        }),
        execute: async ({ cropType }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const [inputsTotal] = await db
              .select({ total: sum(inputs.totalPrice), count: count() })
              .from(inputs)
              .where(eq(inputs.seasonId, season.id));

            const [servicesTotal] = await db
              .select({ total: sum(services.totalCost), count: count() })
              .from(services)
              .where(eq(services.seasonId, season.id));

            const inputsList = await db
              .select()
              .from(inputs)
              .where(eq(inputs.seasonId, season.id));

            const paidInputs = inputsList
              .filter((i) => i.paymentStatus === "paid")
              .reduce((s, i) => s + parseFloat(i.totalPrice || "0"), 0);

            const pendingInputs = inputsList
              .filter((i) => i.paymentStatus === "pending")
              .reduce((s, i) => s + parseFloat(i.totalPrice || "0"), 0);

            return {
              safra: season.name,
              area: `${season.totalAreaHa} ha`,
              insumos: {
                total: String(inputsTotal?.total ?? "0"),
                quantidade: inputsTotal?.count ?? 0,
                pago: paidInputs.toFixed(2),
                pendente: pendingInputs.toFixed(2),
              },
              servicos: {
                total: String(servicesTotal?.total ?? "0"),
                quantidade: servicesTotal?.count ?? 0,
              },
              custoTotal: (
                parseFloat(String(inputsTotal?.total ?? "0")) +
                parseFloat(String(servicesTotal?.total ?? "0"))
              ).toFixed(2),
            };
          } catch {
            return { error: "Erro ao consultar banco de dados" };
          }
        },
      }),

      consultarAtividades: tool({
        description:
          "Consulta as atividades de manejo/planejamento de uma safra.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
        }),
        execute: async ({ cropType }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const activityList = await db
              .select()
              .from(activities)
              .where(eq(activities.seasonId, season.id))
              .orderBy(activities.scheduledDate);

            return {
              safra: season.name,
              atividades: activityList.map((a) => ({
                titulo: a.title,
                tipo: a.activityType,
                data: a.scheduledDate,
                status: a.status,
                quantidade: a.quantity,
                observacoes: a.observations?.substring(0, 200),
              })),
            };
          } catch {
            return { error: "Erro ao consultar banco de dados" };
          }
        },
      }),

      consultarPrevisao: tool({
        description:
          "Consulta a previsão de produtividade de uma safra.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
        }),
        execute: async ({ cropType }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const [assessment] = await db
              .select()
              .from(yieldAssessments)
              .where(eq(yieldAssessments.seasonId, season.id))
              .limit(1);

            if (!assessment)
              return { error: "Nenhuma avaliação de produtividade encontrada" };

            const sacksPerHa = parseFloat(assessment.sacksPerHa || "0");
            const pricePerSack = parseFloat(assessment.pricePerSack || "0");
            const costSacks = parseFloat(assessment.productionCostSacks || "0");
            const totalArea = parseFloat(season.totalAreaHa || "0");

            return {
              safra: season.name,
              cultivar: assessment.cultivarName,
              produtividade: {
                kgPorHa: assessment.kgPerHa,
                sacasPorHa: assessment.sacksPerHa,
                perdasEstimadas: `${assessment.estimatedLossPct}%`,
              },
              financeiro: {
                precoSaca: `R$ ${pricePerSack}`,
                custoProducaoSacas: `${costSacks} sc/ha`,
                receitaBrutaPorHa: `R$ ${(sacksPerHa * pricePerSack).toFixed(2)}`,
                resultadoLiquidoPorHa: `R$ ${((sacksPerHa - costSacks) * pricePerSack).toFixed(2)}`,
                receitaBrutaTotal: `R$ ${(sacksPerHa * pricePerSack * totalArea).toFixed(2)}`,
                resultadoLiquidoTotal: `R$ ${((sacksPerHa - costSacks) * pricePerSack * totalArea).toFixed(2)}`,
              },
              dadosPlanta: {
                populacaoHa: assessment.plantPopulationHa,
                mediaVagensPorPlanta: assessment.avgPodsPerPlant,
                mediaGraosPorVagem: assessment.avgGrainsPerPod,
                graosM2: assessment.grainsPerM2,
              },
            };
          } catch {
            return { error: "Erro ao consultar banco de dados" };
          }
        },
      }),

      consultarFinanceiro: tool({
        description: "Consulta os dados financeiros da fazenda.",
        inputSchema: z.object({
          mes: z.number().min(1).max(12).optional().describe("Mês (1-12)"),
          ano: z.number().optional().describe("Ano"),
        }),
        execute: async ({ mes, ano }) => {
          const year = ano ?? 2026;
          try {
            const allEntries = await db
              .select()
              .from(financialEntries)
              .where(eq(financialEntries.year, year));

            const filtered = mes
              ? allEntries.filter((e) => e.month === mes)
              : allEntries;

            const total = filtered.reduce(
              (s, e) => s + parseFloat(e.amount),
              0
            );

            const byCategory = new Map<string, number>();
            for (const entry of filtered) {
              const current = byCategory.get(entry.category) ?? 0;
              byCategory.set(entry.category, current + parseFloat(entry.amount));
            }

            const categories = Array.from(byCategory.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, val]) => ({
                categoria: cat,
                valor: `R$ ${val.toFixed(2)}`,
              }));

            return {
              periodo: mes ? `${mes}/${year}` : `Ano ${year}`,
              totalGastos: `R$ ${total.toFixed(2)}`,
              quantidadeLancamentos: filtered.length,
              porCategoria: categories,
            };
          } catch {
            return { error: "Erro ao consultar banco de dados" };
          }
        },
      }),

      registrarInsumo: tool({
        description:
          "Registra um novo insumo (semente, fertilizante, herbicida, etc.) em uma safra. Use quando o usuário pedir para adicionar um insumo.",
        inputSchema: z.object({
          cropType: z
            .enum(["soy", "corn"])
            .describe("Tipo de cultura da safra"),
          nome: z.string().describe("Nome do produto/insumo"),
          categoria: z
            .enum([
              "seed",
              "fertilizer",
              "herbicide",
              "insecticide",
              "fungicide",
              "adjuvant",
              "other",
            ])
            .describe("Categoria do insumo"),
          quantidade: z.number().optional().describe("Quantidade"),
          valorUnitario: z.number().optional().describe("Valor unitário em reais"),
          valorTotal: z.number().optional().describe("Valor total em reais"),
          unidade: z.string().optional().describe("Unidade (Litro, Kg, etc.)"),
          fornecedor: z.string().optional().describe("Nome do fornecedor"),
        }),
        execute: async ({
          cropType,
          nome,
          categoria,
          quantidade,
          valorUnitario,
          valorTotal,
          unidade,
          fornecedor,
        }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const total =
              valorTotal ?? (quantidade ?? 0) * (valorUnitario ?? 0);

            await db.insert(inputs).values({
              seasonId: season.id,
              name: nome,
              category: categoria,
              quantity: quantidade?.toString() ?? null,
              unitPrice: valorUnitario?.toString() ?? null,
              totalPrice: total.toString(),
              unit: unidade ?? null,
              supplier: fornecedor ?? null,
              paymentStatus: "pending",
            });

            return {
              sucesso: true,
              mensagem: `Insumo "${nome}" registrado na ${season.name} com valor total de R$ ${total.toFixed(2)}`,
            };
          } catch {
            return { error: "Erro ao registrar insumo" };
          }
        },
      }),

      registrarServico: tool({
        description:
          "Registra um novo serviço (pulverização, mão de obra, etc.) em uma safra.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
          descricao: z.string().describe("Descrição do serviço"),
          hectares: z.number().optional().describe("Hectares trabalhados"),
          custoPorHectare: z
            .number()
            .optional()
            .describe("Custo por hectare em reais"),
          horas: z.number().optional().describe("Horas trabalhadas"),
          custoPorHora: z
            .number()
            .optional()
            .describe("Custo por hora em reais"),
          valorTotal: z.number().optional().describe("Valor total em reais"),
          trabalhador: z.string().optional().describe("Nome do trabalhador"),
        }),
        execute: async ({
          cropType,
          descricao,
          hectares,
          custoPorHectare,
          horas,
          custoPorHora,
          valorTotal,
          trabalhador,
        }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            let total = valorTotal ?? 0;
            if (!valorTotal) {
              if (hectares && custoPorHectare) total = hectares * custoPorHectare;
              else if (horas && custoPorHora) total = horas * custoPorHora;
            }

            await db.insert(services).values({
              seasonId: season.id,
              description: descricao,
              hectares: hectares?.toString() ?? null,
              costPerHectare: custoPorHectare?.toString() ?? null,
              hours: horas?.toString() ?? null,
              costPerHour: custoPorHora?.toString() ?? null,
              totalCost: total.toString(),
              workerName: trabalhador ?? null,
              paymentStatus: "pending",
            });

            return {
              sucesso: true,
              mensagem: `Serviço "${descricao}" registrado na ${season.name} com valor total de R$ ${total.toFixed(2)}`,
            };
          } catch {
            return { error: "Erro ao registrar serviço" };
          }
        },
      }),

      registrarGasto: tool({
        description:
          "Registra um gasto financeiro da fazenda (gasolina, supermercado, energia, etc.).",
        inputSchema: z.object({
          categoria: z.string().describe("Categoria do gasto (ex: Gasolina, Energia, Supermercados)"),
          descricao: z.string().optional().describe("Descrição adicional"),
          valor: z.number().describe("Valor em reais"),
          data: z.string().optional().describe("Data no formato YYYY-MM-DD. Se não informada, usa hoje."),
        }),
        execute: async ({ categoria, descricao, valor, data }) => {
          try {
            const [farm] = await db
              .select({ id: farms.id })
              .from(farms)
              .limit(1);
            if (!farm) return { error: "Fazenda não encontrada" };

            const dateStr = data ?? new Date().toISOString().split("T")[0];
            const dateObj = new Date(dateStr);

            await db.insert(financialEntries).values({
              farmId: farm.id,
              type: "expense",
              category: categoria,
              description: descricao ?? null,
              amount: valor.toString(),
              date: dateStr,
              month: dateObj.getMonth() + 1,
              year: dateObj.getFullYear(),
            });

            return {
              sucesso: true,
              mensagem: `Gasto de R$ ${valor.toFixed(2)} em "${categoria}" registrado em ${dateObj.toLocaleDateString("pt-BR")}`,
            };
          } catch {
            return { error: "Erro ao registrar gasto" };
          }
        },
      }),

      registrarAtividade: tool({
        description:
          "Registra uma nova atividade de manejo/planejamento em uma safra.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
          titulo: z.string().describe("Título da atividade"),
          tipo: z
            .enum([
              "soil_prep",
              "planting",
              "spraying",
              "fertilizing",
              "harvest",
              "other",
            ])
            .describe("Tipo de atividade"),
          data: z
            .string()
            .optional()
            .describe("Data programada (YYYY-MM-DD)"),
          quantidade: z
            .string()
            .optional()
            .describe("Quantidade/dose (ex: 3L/ha)"),
          observacoes: z.string().optional().describe("Observações"),
        }),
        execute: async ({
          cropType,
          titulo,
          tipo,
          data,
          quantidade,
          observacoes,
        }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            await db.insert(activities).values({
              seasonId: season.id,
              title: titulo,
              activityType: tipo,
              scheduledDate: data ?? null,
              quantity: quantidade ?? null,
              observations: observacoes ?? null,
              status: "planned",
            });

            return {
              sucesso: true,
              mensagem: `Atividade "${titulo}" registrada na ${season.name}`,
            };
          } catch {
            return { error: "Erro ao registrar atividade" };
          }
        },
      }),
      consultarAdiantamentos: tool({
        description:
          "Consulta os adiantamentos (dinheiro/materiais) feitos ao Valdeci ou outros trabalhadores.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).optional().describe("Filtrar por safra"),
        }),
        execute: async ({ cropType }) => {
          try {
            let advanceList;
            if (cropType) {
              const [season] = await db
                .select()
                .from(cropSeasons)
                .where(eq(cropSeasons.cropType, cropType))
                .limit(1);
              if (!season) return { error: "Safra não encontrada" };
              advanceList = await db
                .select()
                .from(advances)
                .where(eq(advances.seasonId, season.id));
            } else {
              advanceList = await db.select().from(advances);
            }

            const total = advanceList.reduce(
              (s, a) => s + parseFloat(a.value ?? "0"),
              0
            );

            return {
              adiantamentos: advanceList.map((a) => ({
                destinatario: a.recipient,
                produto: a.product,
                quantidade: a.quantity,
                valor: a.value ? `R$ ${parseFloat(a.value).toFixed(2)}` : "Pendente",
                data: a.date,
              })),
              total: `R$ ${total.toFixed(2)}`,
              quantidade: advanceList.length,
            };
          } catch {
            return { error: "Erro ao consultar adiantamentos" };
          }
        },
      }),

      consultarEmprestimos: tool({
        description:
          "Consulta os empréstimos bancários da fazenda (Cresol).",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const loanList = await db.select().from(loans);
            const totalPayable = loanList.reduce(
              (s, l) => s + parseFloat(l.amountPayable ?? l.totalAmount),
              0
            );

            return {
              emprestimos: loanList.map((l) => ({
                descricao: l.description,
                banco: l.bank,
                valorEmprestimo: `R$ ${parseFloat(l.totalAmount).toFixed(2)}`,
                valorAPagar: l.amountPayable
                  ? `R$ ${parseFloat(l.amountPayable).toFixed(2)}`
                  : null,
                status: l.status,
              })),
              totalAPagar: `R$ ${totalPayable.toFixed(2)}`,
            };
          } catch {
            return { error: "Erro ao consultar empréstimos" };
          }
        },
      }),

      consultarTalhoes: tool({
        description:
          "Consulta os talhões (parcelas de terra) da fazenda com suas áreas.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const fieldList = await db.select().from(fields);
            const totalArea = fieldList.reduce(
              (s, f) => s + parseFloat(f.areaHa ?? "0"),
              0
            );

            return {
              talhoes: fieldList.map((f) => ({
                nome: f.name,
                area: f.areaHa ? `${f.areaHa} ha` : "Não definida",
                observacoes: f.notes,
              })),
              totalTalhoes: fieldList.length,
              areaTotal: `${totalArea.toFixed(2)} ha`,
            };
          } catch {
            return { error: "Erro ao consultar talhões" };
          }
        },
      }),

      consultarConsultoria: tool({
        description:
          "Consulta as visitas de consultoria realizadas na fazenda.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const visitList = await db
              .select()
              .from(consultingVisits)
              .orderBy(desc(consultingVisits.visitDate));

            return {
              visitas: visitList.map((v) => ({
                data: v.visitDate,
                atividades: v.activities,
                recomendacoes: v.recommendations,
              })),
              totalVisitas: visitList.length,
            };
          } catch {
            return { error: "Erro ao consultar visitas" };
          }
        },
      }),

      consultarComparativoCultivares: tool({
        description:
          "Consulta e compara os dados de produtividade dos cultivares Lote A e Lote B da soja.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, "soy"))
              .limit(1);

            if (!season) return { error: "Safra de soja não encontrada" };

            const assessments = await db
              .select()
              .from(yieldAssessments)
              .where(eq(yieldAssessments.seasonId, season.id));

            return {
              safra: season.name,
              cultivares: assessments.map((a) => {
                const sacksPerHa = parseFloat(a.sacksPerHa || "0");
                const pricePerSack = parseFloat(a.pricePerSack || "0");
                const costSacks = parseFloat(a.productionCostSacks || "0");
                const totalArea = parseFloat(season.totalAreaHa || "0");
                const lossPct = parseFloat(a.estimatedLossPct || "0");

                return {
                  nome: a.cultivarName,
                  kgPorHa: a.kgPerHa,
                  sacasPorHa: a.sacksPerHa,
                  populacaoHa: a.plantPopulationHa,
                  vagensPorPlanta: a.avgPodsPerPlant,
                  graosPorVagem: a.avgGrainsPerPod,
                  graosPorPlanta: a.avgGrainsPerPlant,
                  pmg: a.weight1000GrainsKg,
                  perdasEstimadas: `${lossPct}%`,
                  precoSaca: `R$ ${pricePerSack.toFixed(2)}`,
                  receitaBrutaPorHa: `R$ ${(sacksPerHa * pricePerSack).toFixed(2)}`,
                  custoProducaoPorHa: `R$ ${(costSacks * pricePerSack).toFixed(2)}`,
                  resultadoLiquidoPorHa: `R$ ${((sacksPerHa - costSacks) * pricePerSack).toFixed(2)}`,
                  receitaBrutaTotal: `R$ ${(sacksPerHa * pricePerSack * totalArea).toFixed(2)}`,
                };
              }),
            };
          } catch {
            return { error: "Erro ao consultar comparativo" };
          }
        },
      }),

      gerarRelatorioResumo: tool({
        description:
          "Gera um relatório resumido com todos os dados principais da fazenda: custos, financeiro, produtividade, empréstimos e status geral.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const allSeasons = await db.select().from(cropSeasons);
            const loanList = await db.select().from(loans);
            const fieldList = await db.select().from(fields);

            let totalInputs = 0;
            let totalServices = 0;
            let totalPaid = 0;
            let totalPending = 0;

            for (const s of allSeasons) {
              const [iSum] = await db
                .select({ total: sum(inputs.totalPrice) })
                .from(inputs)
                .where(eq(inputs.seasonId, s.id));
              totalInputs += parseFloat(iSum?.total ?? "0");

              const [sSum] = await db
                .select({ total: sum(services.totalCost) })
                .from(services)
                .where(eq(services.seasonId, s.id));
              totalServices += parseFloat(sSum?.total ?? "0");

              const inputsList = await db
                .select()
                .from(inputs)
                .where(eq(inputs.seasonId, s.id));

              totalPaid += inputsList
                .filter((i) => i.paymentStatus === "paid")
                .reduce((acc, i) => acc + parseFloat(i.totalPrice || "0"), 0);
              totalPending += inputsList
                .filter((i) => i.paymentStatus === "pending")
                .reduce((acc, i) => acc + parseFloat(i.totalPrice || "0"), 0);
            }

            const allExpenses = await db
              .select()
              .from(financialEntries)
              .where(eq(financialEntries.type, "expense"));
            const allIncome = await db
              .select()
              .from(financialEntries)
              .where(eq(financialEntries.type, "income"));

            const totalExpenses = allExpenses.reduce(
              (s, e) => s + parseFloat(e.amount),
              0
            );
            const totalIncome = allIncome.reduce(
              (s, e) => s + parseFloat(e.amount),
              0
            );

            const totalLoanPayable = loanList.reduce(
              (s, l) => s + parseFloat(l.amountPayable ?? l.totalAmount),
              0
            );

            return {
              safras: allSeasons.map((s) => ({
                nome: s.name,
                cultura: s.cropType === "soy" ? "Soja" : s.cropType === "corn" ? "Milho" : s.cropType,
                area: `${s.totalAreaHa} ha`,
                status: s.status,
              })),
              custosSafras: {
                insumos: `R$ ${totalInputs.toFixed(2)}`,
                servicos: `R$ ${totalServices.toFixed(2)}`,
                total: `R$ ${(totalInputs + totalServices).toFixed(2)}`,
                pago: `R$ ${totalPaid.toFixed(2)}`,
                pendente: `R$ ${totalPending.toFixed(2)}`,
              },
              financeiroPessoal: {
                despesas: `R$ ${totalExpenses.toFixed(2)}`,
                receitas: `R$ ${totalIncome.toFixed(2)}`,
                saldo: `R$ ${(totalIncome - totalExpenses).toFixed(2)}`,
              },
              emprestimos: {
                total: `R$ ${totalLoanPayable.toFixed(2)}`,
                quantidade: loanList.length,
              },
              talhoes: {
                quantidade: fieldList.length,
                areaMapeada: `${fieldList.reduce((s, f) => s + parseFloat(f.areaHa ?? "0"), 0).toFixed(2)} ha`,
              },
            };
          } catch {
            return { error: "Erro ao gerar relatório" };
          }
        },
      }),

      consultarInsumosDetalhados: tool({
        description:
          "Consulta a lista detalhada de insumos de uma safra, incluindo nome, categoria, quantidade, valor e status de pagamento.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
        }),
        execute: async ({ cropType }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const inputsList = await db
              .select()
              .from(inputs)
              .where(eq(inputs.seasonId, season.id));

            const categoryMap: Record<string, string> = {
              seed: "Semente",
              fertilizer: "Fertilizante",
              herbicide: "Herbicida",
              insecticide: "Inseticida",
              fungicide: "Fungicida",
              adjuvant: "Adjuvante",
              other: "Outro",
            };

            return {
              safra: season.name,
              insumos: inputsList.map((i) => ({
                nome: i.name,
                categoria: categoryMap[i.category] ?? i.category,
                quantidade: i.quantity,
                unidade: i.unit,
                valorUnitario: i.unitPrice ? `R$ ${parseFloat(i.unitPrice).toFixed(2)}` : null,
                valorTotal: i.totalPrice ? `R$ ${parseFloat(i.totalPrice).toFixed(2)}` : null,
                pagamento: i.paymentStatus === "paid" ? "Pago" : i.paymentStatus === "pending" ? "Pendente" : "Parcial",
              })),
              total: inputsList.length,
            };
          } catch {
            return { error: "Erro ao consultar insumos" };
          }
        },
      }),

      consultarServicosDetalhados: tool({
        description:
          "Consulta a lista detalhada de serviços de uma safra, incluindo descrição, hectares, horas, custo e status de pagamento.",
        inputSchema: z.object({
          cropType: z.enum(["soy", "corn"]).describe("Tipo de cultura"),
        }),
        execute: async ({ cropType }) => {
          try {
            const [season] = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.cropType, cropType))
              .limit(1);

            if (!season) return { error: "Safra não encontrada" };

            const servicesList = await db
              .select()
              .from(services)
              .where(eq(services.seasonId, season.id));

            return {
              safra: season.name,
              servicos: servicesList.map((s) => ({
                descricao: s.description,
                hectares: s.hectares,
                horas: s.hours,
                custoPorHectare: s.costPerHectare ? `R$ ${parseFloat(s.costPerHectare).toFixed(2)}` : null,
                custoPorHora: s.costPerHour ? `R$ ${parseFloat(s.costPerHour).toFixed(2)}` : null,
                custoTotal: s.totalCost ? `R$ ${parseFloat(s.totalCost).toFixed(2)}` : null,
                trabalhador: s.workerName,
                pagamento: s.paymentStatus === "paid" ? "Pago" : s.paymentStatus === "pending" ? "Pendente" : "Parcial",
              })),
              total: servicesList.length,
            };
          } catch {
            return { error: "Erro ao consultar serviços" };
          }
        },
      }),

      // ─── Rain/Precipitation Tools ─────────────────────────────────────

      consultarChuvas: tool({
        description:
          "Consulta dados de chuva/precipitação da fazenda em um período. Usa dados da API Open-Meteo combinados com medições manuais.",
        inputSchema: z.object({
          dataInicio: z
            .string()
            .describe("Data de início no formato YYYY-MM-DD"),
          dataFim: z.string().describe("Data de fim no formato YYYY-MM-DD"),
        }),
        execute: async ({ dataInicio, dataFim }) => {
          try {
            const data = await getMergedRainData(dataInicio, dataFim);
            const total = data.reduce((s, d) => s + d.precipitationMm, 0);
            const rainyDays = data.filter(
              (d) => d.precipitationMm > 0
            ).length;
            const maxDay = data.reduce(
              (max, d) =>
                d.precipitationMm > max.precipitationMm ? d : max,
              { date: "", precipitationMm: 0, source: "api" as const }
            );

            return {
              periodo: `${dataInicio} a ${dataFim}`,
              totalMm: total.toFixed(1),
              diasComChuva: rainyDays,
              totalDias: data.length,
              maiorRegistro: {
                data: maxDay.date,
                mm: maxDay.precipitationMm.toFixed(1),
              },
              dadosDiarios: data.slice(-14).map((d) => ({
                data: d.date,
                mm: d.precipitationMm.toFixed(1),
                fonte: d.source === "manual" ? "Manual" : "API",
              })),
            };
          } catch {
            return { error: "Erro ao consultar dados de chuva" };
          }
        },
      }),

      consultarPrevisaoChuva: tool({
        description:
          "Consulta a previsão de chuva para os próximos 14 dias na fazenda.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const data = await fetchForecastRain();
            const total = data.reduce((s, d) => s + d.precipitationMm, 0);

            return {
              periodo: `${data[0]?.date} a ${data[data.length - 1]?.date}`,
              totalPrevistoMm: total.toFixed(1),
              diasComChuva: data.filter((d) => d.precipitationMm > 0).length,
              previsao: data.map((d) => ({
                data: d.date,
                mm: d.precipitationMm.toFixed(1),
              })),
            };
          } catch {
            return { error: "Erro ao consultar previsão" };
          }
        },
      }),

      consultarNecessidadeHidrica: tool({
        description:
          "Consulta a necessidade hídrica das culturas e compara com a chuva recebida. Ajuda a avaliar se as lavouras estão recebendo água suficiente.",
        inputSchema: z.object({
          tipoCultura: z
            .enum(["soy", "corn"])
            .optional()
            .describe(
              "Tipo de cultura (opcional, se não informado mostra todas)"
            ),
        }),
        execute: async ({ tipoCultura }) => {
          try {
            const allSeasons = await db
              .select()
              .from(cropSeasons)
              .where(eq(cropSeasons.status, "active"));

            const filteredSeasons = tipoCultura
              ? allSeasons.filter((s) => s.cropType === tipoCultura)
              : allSeasons;

            const results = [];
            for (const season of filteredSeasons) {
              const start = season.plantingDate ?? "2025-10-01";
              const end = new Date().toISOString().split("T")[0];
              const rainData = await getMergedRainData(start, end);
              const accMm = rainData.reduce(
                (s, d) => s + d.precipitationMm,
                0
              );

              const status = computeCropWaterStatus(
                season.cropType,
                season.plantingDate,
                season.harvestDate,
                accMm
              );

              results.push({
                safra: season.name,
                cultura: status.cropLabel,
                area: `${season.totalAreaHa} ha`,
                chuvaRecebida: `${status.accumulatedMm.toFixed(0)} mm`,
                necessidadeMinima: `${status.minMm} mm`,
                necessidadeIdeal: `${status.maxMm} mm`,
                diasDecorridos: status.daysElapsed,
                esperadoAteHoje: `${status.expectedMmToDate.toFixed(0)} mm`,
                status:
                  status.status === "deficit"
                    ? "DÉFICIT HÍDRICO"
                    : status.status === "excess"
                      ? "EXCESSO"
                      : "ADEQUADO",
                percentualDoIdeal: `${status.percentOfIdeal.toFixed(0)}%`,
                fasesCriticas: status.peakStage,
              });
            }

            return { culturas: results };
          } catch {
            return { error: "Erro ao consultar necessidade hídrica" };
          }
        },
      }),

      registrarChuva: tool({
        description: "Registra uma medição manual de chuva na fazenda.",
        inputSchema: z.object({
          data: z.string().describe("Data no formato YYYY-MM-DD"),
          volumeMm: z
            .number()
            .describe("Volume de chuva em milímetros"),
          observacoes: z
            .string()
            .optional()
            .describe("Observações sobre a chuva"),
        }),
        execute: async ({ data, volumeMm, observacoes }) => {
          try {
            const [farm] = await db
              .select({ id: farms.id })
              .from(farms)
              .limit(1);
            if (!farm) return { error: "Fazenda não encontrada" };

            await db.insert(rainEntries).values({
              farmId: farm.id,
              date: data,
              volumeMm: volumeMm.toString(),
              source: "manual",
              notes: observacoes ?? null,
            });

            return {
              sucesso: true,
              mensagem: `Chuva de ${volumeMm} mm registrada em ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`,
            };
          } catch {
            return { error: "Erro ao registrar chuva" };
          }
        },
      }),
    },
    stopWhen: stepCountIs(8),
  });

  // Consume stream to ensure completion even if client disconnects
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      if (!chatId) return;
      try {
        // Save all messages to the session
        await db
          .update(chatSessions)
          .set({
            messages: finalMessages as unknown as Record<string, unknown>[],
            updatedAt: new Date(),
          })
          .where(eq(chatSessions.id, chatId));

        // Auto-title from first user message if no title yet
        const [currentSession] = await db
          .select({ title: chatSessions.title })
          .from(chatSessions)
          .where(eq(chatSessions.id, chatId))
          .limit(1);

        if (!currentSession?.title) {
          const firstUserMsg = finalMessages.find(
            (m) => m.role === "user"
          );
          if (firstUserMsg) {
            const text = getTextFromUIMessage(firstUserMsg);
            if (text) {
              await db
                .update(chatSessions)
                .set({ title: text.substring(0, 80) })
                .where(eq(chatSessions.id, chatId));
            }
          }
        }
      } catch {
        // persistence errors should not break the chat
      }
    },
  });
}
