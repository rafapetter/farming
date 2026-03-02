"use server";

import { db } from "@/server/db";
import { cropSeasons, inputs, services, activities } from "@/server/db/schema";
import { eq, and, gte, sum } from "drizzle-orm";

export async function getNotificationData() {
  let pendingPayments = 0;
  let upcomingActivities: Array<{
    title: string;
    date: string | null;
    seasonId: string;
  }> = [];

  try {
    const seasons = await db
      .select()
      .from(cropSeasons)
      .where(eq(cropSeasons.status, "active"));

    for (const season of seasons) {
      const [pendInput] = await db
        .select({ total: sum(inputs.totalPrice) })
        .from(inputs)
        .where(
          and(
            eq(inputs.seasonId, season.id),
            eq(inputs.paymentStatus, "pending")
          )
        );
      pendingPayments += parseFloat(pendInput?.total ?? "0");

      const [pendService] = await db
        .select({ total: sum(services.totalCost) })
        .from(services)
        .where(
          and(
            eq(services.seasonId, season.id),
            eq(services.paymentStatus, "pending")
          )
        );
      pendingPayments += parseFloat(pendService?.total ?? "0");
    }

    const today = new Date().toISOString().split("T")[0];
    upcomingActivities = await db
      .select({
        title: activities.title,
        date: activities.scheduledDate,
        seasonId: activities.seasonId,
      })
      .from(activities)
      .where(
        and(
          eq(activities.status, "planned"),
          gte(activities.scheduledDate, today)
        )
      )
      .orderBy(activities.scheduledDate)
      .limit(5);
  } catch {
    // DB not connected
  }

  return { pendingPayments, upcomingActivities };
}
