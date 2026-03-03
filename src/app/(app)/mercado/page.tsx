import { db } from "@/server/db";
import { commodityPrices, buyers, farms } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MercadoClient } from "./mercado-client";

export default async function MercadoPage() {
  let farmId = "";
  let soyPrices: Array<{ date: string; price: number; source: string }> = [];
  let cornPrices: Array<{ date: string; price: number; source: string }> = [];
  let buyerList: Array<{
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    commodities: unknown;
    lastContactDate: string | null;
    notes: string | null;
    active: boolean;
  }> = [];

  try {
    const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
    if (farm) farmId = farm.id;

    // Get last 60 days of prices
    const allPrices = await db
      .select({
        date: commodityPrices.date,
        source: commodityPrices.source,
        commodity: commodityPrices.commodity,
        pricePerSack: commodityPrices.pricePerSack,
        priceDollar: commodityPrices.priceDollar,
      })
      .from(commodityPrices)
      .where(eq(commodityPrices.farmId, farmId))
      .orderBy(desc(commodityPrices.date))
      .limit(200);

    for (const p of allPrices) {
      const entry = {
        date: p.date,
        price: parseFloat(p.pricePerSack ?? "0"),
        source: p.source,
      };
      if (p.commodity === "soy") soyPrices.push(entry);
      else cornPrices.push(entry);
    }

    buyerList = await db
      .select({
        id: buyers.id,
        name: buyers.name,
        company: buyers.company,
        phone: buyers.phone,
        email: buyers.email,
        location: buyers.location,
        commodities: buyers.commodities,
        lastContactDate: buyers.lastContactDate,
        notes: buyers.notes,
        active: buyers.active,
      })
      .from(buyers)
      .where(eq(buyers.farmId, farmId));
  } catch {
    // DB not connected
  }

  // Build chart data — merge soy + corn by date
  const dateMap = new Map<
    string,
    { date: string; soy?: number; corn?: number; soyCbot?: number; cornCbot?: number }
  >();

  for (const p of soyPrices) {
    const existing = dateMap.get(p.date) ?? { date: p.date };
    if (p.source === "cepea") existing.soy = p.price;
    else existing.soyCbot = p.price;
    dateMap.set(p.date, existing);
  }
  for (const p of cornPrices) {
    const existing = dateMap.get(p.date) ?? { date: p.date };
    if (p.source === "cepea") existing.corn = p.price;
    else existing.cornCbot = p.price;
    dateMap.set(p.date, existing);
  }

  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Latest prices
  const latestSoyCepea = soyPrices.find((p) => p.source === "cepea");
  const latestCornCepea = cornPrices.find((p) => p.source === "cepea");
  const latestSoyCbot = soyPrices.find((p) => p.source === "cbot");
  const latestCornCbot = cornPrices.find((p) => p.source === "cbot");

  return (
    <MercadoClient
      farmId={farmId}
      chartData={chartData}
      latestPrices={{
        soyCepea: latestSoyCepea?.price,
        cornCepea: latestCornCepea?.price,
        soyCbot: latestSoyCbot?.price,
        cornCbot: latestCornCbot?.price,
      }}
      buyers={buyerList}
    />
  );
}
