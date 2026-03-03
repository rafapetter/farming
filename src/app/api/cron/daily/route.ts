import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  farms,
  telegramLinks,
  activities,
  cronLogs,
} from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  fetchCepeaSoyPrice,
  fetchCepeaCornPrice,
  storeCepeaPrice,
} from "@/lib/cepea-api";
import {
  fetchSoyFutures,
  fetchCornFutures,
  storeFuturesPrice,
} from "@/lib/futures-api";
import {
  evaluateAlertRules,
  seedDefaultAlertRules,
} from "@/lib/weather-alerts";
import {
  sendTelegramMessage,
  formatDailySummary,
} from "@/lib/telegram";

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  // Get farm
  const [farm] = await db
    .select({ id: farms.id, name: farms.name })
    .from(farms)
    .limit(1);

  if (!farm) {
    return NextResponse.json({ error: "No farm found" }, { status: 404 });
  }

  // 1. Fetch CEPEA prices
  try {
    const [soy, corn] = await Promise.all([
      fetchCepeaSoyPrice(),
      fetchCepeaCornPrice(),
    ]);
    if (soy) await storeCepeaPrice(soy);
    if (corn) await storeCepeaPrice(corn);
    results.cepea = `soy=${soy?.pricePerSack ?? "N/A"}, corn=${corn?.pricePerSack ?? "N/A"}`;
  } catch (error) {
    results.cepea = `error: ${error}`;
  }

  // 2. Fetch CBOT futures
  try {
    const [soyF, cornF] = await Promise.all([
      fetchSoyFutures(),
      fetchCornFutures(),
    ]);
    if (soyF) await storeFuturesPrice(soyF);
    if (cornF) await storeFuturesPrice(cornF);
    results.cbot = `soy=${soyF?.pricePerSack?.toFixed(2) ?? "N/A"}, corn=${cornF?.pricePerSack?.toFixed(2) ?? "N/A"}`;
  } catch (error) {
    results.cbot = `error: ${error}`;
  }

  // 3. Evaluate weather alerts
  try {
    await seedDefaultAlertRules(farm.id);
    const newAlerts = await evaluateAlertRules(farm.id);
    results.weatherAlerts = `${newAlerts.length} new alerts`;
  } catch (error) {
    results.weatherAlerts = `error: ${error}`;
  }

  // 4. Count activities due today/tomorrow
  let activitiesDue = 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    const due = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          gte(activities.scheduledDate, today),
          lte(activities.scheduledDate, tomorrow)
        )
      );
    activitiesDue = due.length;
    results.activities = `${activitiesDue} due today/tomorrow`;
  } catch (error) {
    results.activities = `error: ${error}`;
  }

  // 5. Send Telegram daily summary
  try {
    const links = await db
      .select()
      .from(telegramLinks)
      .where(
        and(
          eq(telegramLinks.farmId, farm.id),
          eq(telegramLinks.active, true)
        )
      );

    if (links.length > 0) {
      // Get today's prices for summary
      const soyCepeaPrice = results.cepea?.match(/soy=(\d+\.?\d*)/)?.[1];
      const cornCepeaPrice = results.cepea?.match(/corn=(\d+\.?\d*)/)?.[1];
      const alertCount = parseInt(
        results.weatherAlerts?.match(/(\d+)/)?.[1] ?? "0"
      );

      const summary = formatDailySummary({
        farmName: farm.name,
        activitiesDue,
        weatherAlerts: alertCount,
        soyCepeaPrice: soyCepeaPrice ? parseFloat(soyCepeaPrice) : undefined,
        cornCepeaPrice: cornCepeaPrice
          ? parseFloat(cornCepeaPrice)
          : undefined,
      });

      let sent = 0;
      for (const link of links) {
        const ok = await sendTelegramMessage(link.chatId, summary);
        if (ok) sent++;
      }
      results.telegram = `sent to ${sent}/${links.length} chats`;
    } else {
      results.telegram = "no linked chats";
    }
  } catch (error) {
    results.telegram = `error: ${error}`;
  }

  // 6. Log execution
  try {
    await db.insert(cronLogs).values({
      jobName: "daily",
      status: "completed",
      details: results as unknown as Record<string, unknown>,
    });
  } catch {
    // Ignore log errors
  }

  return NextResponse.json({ ok: true, results });
}
