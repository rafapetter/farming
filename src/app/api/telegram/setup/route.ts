import { NextRequest, NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

  const success = await setWebhook(webhookUrl);

  return NextResponse.json({
    success,
    webhookUrl,
    message: success
      ? "Webhook registered successfully"
      : "Failed to register webhook. Check TELEGRAM_BOT_TOKEN.",
  });
}
