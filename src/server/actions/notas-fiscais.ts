"use server";

import { db } from "@/server/db";
import { notasFiscais, inputs, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

async function getFarmId(): Promise<string> {
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) throw new Error("Farm not found");
  return farm.id;
}

interface ExtractedNFData {
  supplier: string;
  nfNumber: string;
  date: string;
  items: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  total: number;
}

export async function uploadNotaFiscal(formData: FormData) {
  const file = formData.get("file") as File;
  const seasonId = (formData.get("seasonId") as string) || null;

  if (!file) {
    return { error: "Arquivo é obrigatório" };
  }

  const farmId = await getFarmId();

  // Convert file to base64 data URL
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Save to DB first with pending status
  const [nf] = await db
    .insert(notasFiscais)
    .values({
      farmId,
      seasonId,
      fileName: file.name,
      fileUrl: dataUrl,
      status: "pending",
    })
    .returning();

  // Use Gemini to extract data
  try {
    const result = await generateText({
      model: google("gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: dataUrl,
              mediaType: mimeType,
            } as any,
            {
              type: "text",
              text: `Analise esta Nota Fiscal e extraia os dados em JSON com esta estrutura exata:
{
  "supplier": "nome do fornecedor",
  "nfNumber": "número da NF",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "nome do produto",
      "category": "seed|fertilizer|herbicide|insecticide|fungicide|adjuvant|other",
      "quantity": 0,
      "unit": "unidade (kg, L, saca, un, etc)",
      "unitPrice": 0.00,
      "totalPrice": 0.00
    }
  ],
  "total": 0.00
}

Regras:
- category deve ser uma das opções listadas
- Para insumos agrícolas, classifique corretamente (sementes=seed, adubos/fertilizantes=fertilizer, etc)
- Preços em reais (R$)
- Retorne APENAS o JSON, sem markdown ou explicações`,
            },
          ],
        },
      ],
    });

    // Parse the extracted data
    const jsonText = result.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const extractedData: ExtractedNFData = JSON.parse(jsonText);

    // Update NF with extracted data
    await db
      .update(notasFiscais)
      .set({
        extractedData: extractedData as unknown as Record<string, unknown>,
        status: "processed",
      })
      .where(eq(notasFiscais.id, nf.id));

    revalidatePath("/mercado");
    return { success: true, nfId: nf.id, data: extractedData };
  } catch (error) {
    console.error("NF extraction error:", error);

    await db
      .update(notasFiscais)
      .set({ status: "error", notes: String(error) })
      .where(eq(notasFiscais.id, nf.id));

    return { error: "Falha ao processar a nota fiscal" };
  }
}

/** Confirm NF and create input records from extracted data */
export async function confirmNotaFiscal(nfId: string, seasonId: string) {
  const [nf] = await db
    .select()
    .from(notasFiscais)
    .where(eq(notasFiscais.id, nfId))
    .limit(1);

  if (!nf || !nf.extractedData) {
    return { error: "Nota fiscal não encontrada ou não processada" };
  }

  const data = nf.extractedData as unknown as ExtractedNFData;

  // Create input records for each item
  for (const item of data.items) {
    await db.insert(inputs).values({
      seasonId,
      name: item.name,
      category: item.category as any,
      unit: item.unit,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.totalPrice),
      paymentStatus: "paid",
      paymentDate: data.date,
      supplier: data.supplier,
      notes: `NF: ${data.nfNumber}`,
    });
  }

  // Update NF with season link
  await db
    .update(notasFiscais)
    .set({ seasonId })
    .where(eq(notasFiscais.id, nfId));

  revalidatePath("/safras");
  return { success: true, itemsCreated: data.items.length };
}

/** Get all notas fiscais for a farm */
export async function getNotasFiscais(farmId: string) {
  return db
    .select({
      id: notasFiscais.id,
      fileName: notasFiscais.fileName,
      status: notasFiscais.status,
      extractedData: notasFiscais.extractedData,
      seasonId: notasFiscais.seasonId,
      createdAt: notasFiscais.createdAt,
    })
    .from(notasFiscais)
    .where(eq(notasFiscais.farmId, farmId));
}
