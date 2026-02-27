import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
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
} from "@/server/db/schema";
import { eq, sum, count } from "drizzle-orm";

const SYSTEM_PROMPT = `Você é o "Agente Fazenda", um assistente agrícola inteligente da Fazenda Primavera.

Contexto:
- A fazenda fica em Goiás, Brasil
- Área total: 39,23 hectares
- Safra atual: Soja 2025/2026 (35,8 ha) e Milho 2025/2026 (3,43 ha)
- Proprietária: Christina
- A fazenda cultiva principalmente soja e milho

Suas capacidades:
- Consultar custos de insumos e serviços das safras
- Consultar atividades de planejamento/manejo
- Consultar previsão de produtividade
- Consultar dados financeiros
- Registrar novos insumos, serviços, atividades e gastos
- Fornecer insights e recomendações agrícolas
- Explicar dados em linguagem simples

Regras:
- Sempre responda em português brasileiro
- Use termos agrícolas comuns no Brasil (sacas, hectares, talhão, etc.)
- Seja conciso mas informativo
- Quando consultar dados, apresente-os de forma organizada
- Se não souber algo específico, diga honestamente
- Formate valores monetários em reais (R$)
- Use o formato brasileiro de números (vírgula para decimais, ponto para milhares)
- Quando o usuário pedir para registrar algo, confirme os dados antes ou logo após registrar
- Use cropType "soy" para soja e "corn" para milho`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: SYSTEM_PROMPT,
    messages,
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
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
