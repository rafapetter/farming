import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { telegramLinks, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  sendTelegramMessage,
  formatPriceMessage,
  formatWeatherAlertMessage,
  formatForecastMessage,
} from "@/lib/telegram";
import { getCachedOrFetchCepea } from "@/lib/cepea-api";
import { fetchWeatherForecast, getRecentAlerts } from "@/lib/weather-alerts";

async function getFarm() {
  const [farm] = await db
    .select({ id: farms.id, name: farms.name })
    .from(farms)
    .limit(1);
  return farm;
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.CRON_SECRET ?? "webhook-secret";
  if (secretHeader && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = body.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const username = message.from?.username ?? message.from?.first_name ?? "";

    const farm = await getFarm();
    if (!farm) {
      await sendTelegramMessage(chatId, "Fazenda não configurada.");
      return NextResponse.json({ ok: true });
    }

    // Handle commands
    if (text === "/start") {
      // Link this chat to the farm
      const existing = await db
        .select()
        .from(telegramLinks)
        .where(eq(telegramLinks.chatId, chatId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(telegramLinks).values({
          farmId: farm.id,
          chatId,
          username,
          active: true,
        });
      } else if (!existing[0].active) {
        await db
          .update(telegramLinks)
          .set({ active: true, username })
          .where(eq(telegramLinks.id, existing[0].id));
      }

      await sendTelegramMessage(
        chatId,
        `<b>🌾 Fazenda Digital — ${farm.name}</b>\n\nBot vinculado com sucesso!\n\nComandos disponíveis:\n/precos — Cotações de soja e milho\n/clima — Previsão do tempo (7 dias)\n/alertas — Alertas climáticos ativos\n/resumo — Resumo diário da fazenda`
      );
    } else if (text === "/precos") {
      const [soy, corn] = await Promise.all([
        getCachedOrFetchCepea("soy").catch(() => null),
        getCachedOrFetchCepea("corn").catch(() => null),
      ]);

      const msg = formatPriceMessage({
        soyCepea: soy?.pricePerSack,
        cornCepea: corn?.pricePerSack,
      });

      await sendTelegramMessage(chatId, msg);
    } else if (text === "/clima") {
      const forecast = await fetchWeatherForecast();
      if (forecast) {
        await sendTelegramMessage(chatId, formatForecastMessage(forecast));
      } else {
        await sendTelegramMessage(
          chatId,
          "❌ Não foi possível obter a previsão do tempo."
        );
      }
    } else if (text === "/alertas") {
      const alerts = await getRecentAlerts(farm.id, 7);
      const msg = formatWeatherAlertMessage(
        alerts.map((a) => ({ message: a.message, date: a.date }))
      );
      await sendTelegramMessage(chatId, msg);
    } else if (text === "/resumo") {
      await sendTelegramMessage(
        chatId,
        `<b>🌾 ${farm.name}</b>\n\nUse /precos para cotações e /clima para previsão.`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "Comando não reconhecido. Use /precos, /clima, /alertas ou /resumo."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
