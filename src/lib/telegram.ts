const TELEGRAM_API = "https://api.telegram.org/bot";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  return token;
}

export function hasToken(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function getBotInfo(): Promise<{
  username: string;
  firstName: string;
} | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}${getToken()}/getMe`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.ok) return null;
    return {
      username: data.result.username,
      firstName: data.result.first_name,
    };
  } catch {
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  try {
    const response = await fetch(
      `${TELEGRAM_API}${getToken()}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const secret = process.env.CRON_SECRET ?? "webhook-secret";
    const response = await fetch(
      `${TELEGRAM_API}${getToken()}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
        }),
      }
    );
    const data = await response.json();
    console.log("Telegram webhook set:", data);
    return data.ok === true;
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return false;
  }
}

// ─── Message formatters ─────────────────────────────────────────────────────

export function formatPriceMessage(prices: {
  soyCepea?: number;
  cornCepea?: number;
  soyCbot?: number;
  cornCbot?: number;
  exchangeRate?: number;
}): string {
  const lines = ["<b>📊 Cotações de Hoje</b>\n"];

  if (prices.soyCepea) {
    lines.push(
      `🫘 <b>Soja CEPEA:</b> R$ ${prices.soyCepea.toFixed(2)}/saca`
    );
  }
  if (prices.cornCepea) {
    lines.push(
      `🌽 <b>Milho CEPEA:</b> R$ ${prices.cornCepea.toFixed(2)}/saca`
    );
  }
  if (prices.soyCbot) {
    lines.push(
      `🫘 <b>Soja CBOT:</b> R$ ${prices.soyCbot.toFixed(2)}/saca`
    );
  }
  if (prices.cornCbot) {
    lines.push(
      `🌽 <b>Milho CBOT:</b> R$ ${prices.cornCbot.toFixed(2)}/saca`
    );
  }
  if (prices.exchangeRate) {
    lines.push(
      `\n💱 <b>Dólar:</b> R$ ${prices.exchangeRate.toFixed(4)}`
    );
  }

  return lines.join("\n");
}

export function formatWeatherAlertMessage(
  alerts: Array<{ message: string; date: string }>
): string {
  if (alerts.length === 0) return "✅ Sem alertas climáticos no momento.";

  const lines = ["<b>⚠️ Alertas Climáticos</b>\n"];
  for (const alert of alerts) {
    lines.push(`• ${alert.message}`);
  }
  return lines.join("\n");
}

export function formatDailySummary(data: {
  farmName: string;
  activitiesDue: number;
  weatherAlerts: number;
  soyCepeaPrice?: number;
  cornCepeaPrice?: number;
}): string {
  const lines = [
    `<b>🌾 Resumo Diário — ${data.farmName}</b>\n`,
    `📋 <b>Atividades pendentes:</b> ${data.activitiesDue}`,
    `⚠️ <b>Alertas climáticos:</b> ${data.weatherAlerts}`,
  ];

  if (data.soyCepeaPrice) {
    lines.push(
      `🫘 <b>Soja:</b> R$ ${data.soyCepeaPrice.toFixed(2)}/saca`
    );
  }
  if (data.cornCepeaPrice) {
    lines.push(
      `🌽 <b>Milho:</b> R$ ${data.cornCepeaPrice.toFixed(2)}/saca`
    );
  }

  lines.push("\nBom dia! 🚜");
  return lines.join("\n");
}

export function formatForecastMessage(
  forecast: {
    dates: string[];
    tempMax: number[];
    tempMin: number[];
    precipitationSum: number[];
  }
): string {
  const lines = ["<b>🌤 Previsão do Tempo (7 dias)</b>\n"];

  const limit = Math.min(forecast.dates.length, 7);
  for (let i = 0; i < limit; i++) {
    const date = new Date(forecast.dates[i] + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "short", day: "2-digit", month: "2-digit" }
    );
    const rain = forecast.precipitationSum[i];
    const rainIcon = rain > 10 ? "🌧" : rain > 0 ? "🌦" : "☀️";

    lines.push(
      `${rainIcon} <b>${date}</b>: ${forecast.tempMin[i].toFixed(0)}°–${forecast.tempMax[i].toFixed(0)}°C | ${rain.toFixed(1)}mm`
    );
  }

  return lines.join("\n");
}
