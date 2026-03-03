"use server";

import { db } from "@/server/db";
import { telegramLinks, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  sendTelegramMessage,
  setWebhook,
  getBotInfo,
  hasToken,
} from "@/lib/telegram";
import { headers } from "next/headers";

export async function getTelegramStatus() {
  try {
    const tokenExists = hasToken();
    if (!tokenExists) {
      return { configured: false, botUsername: null, linked: false };
    }

    const botInfo = await getBotInfo();
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);

    let linked = false;
    if (farm) {
      const links = await db
        .select({ id: telegramLinks.id })
        .from(telegramLinks)
        .where(eq(telegramLinks.farmId, farm.id))
        .limit(1);
      linked = links.length > 0;
    }

    return {
      configured: true,
      botUsername: botInfo?.username ?? null,
      linked,
    };
  } catch {
    return { configured: false, botUsername: null, linked: false };
  }
}

export async function setupTelegramWebhook(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const headerList = await headers();
    const host = headerList.get("host") ?? "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

    const success = await setWebhook(webhookUrl);

    return {
      success,
      message: success
        ? "Webhook configurado com sucesso!"
        : "Falha ao configurar webhook. Verifique TELEGRAM_BOT_TOKEN.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Erro ao configurar webhook.",
    };
  }
}

export async function sendTelegramTestMessage(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
    if (!farm) return { success: false, message: "Fazenda não encontrada." };

    const links = await db
      .select({ chatId: telegramLinks.chatId })
      .from(telegramLinks)
      .where(eq(telegramLinks.farmId, farm.id));

    if (links.length === 0) {
      return {
        success: false,
        message: "Nenhum chat vinculado. Envie /start para o bot primeiro.",
      };
    }

    let sent = 0;
    for (const link of links) {
      const ok = await sendTelegramMessage(
        link.chatId,
        "<b>✅ Teste de conexão</b>\n\nSeu Telegram está conectado ao Fazenda Digital!"
      );
      if (ok) sent++;
    }

    return {
      success: sent > 0,
      message:
        sent > 0
          ? `Mensagem de teste enviada para ${sent} chat(s)!`
          : "Falha ao enviar mensagem de teste.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Erro ao enviar teste.",
    };
  }
}

export async function unlinkTelegram(
  linkId: string
): Promise<{ success: boolean }> {
  try {
    await db.delete(telegramLinks).where(eq(telegramLinks.id, linkId));
    return { success: true };
  } catch {
    return { success: false };
  }
}
