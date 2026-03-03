import { db } from "@/server/db";
import { commodityPrices, farms } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as cheerio from "cheerio";

async function getFarmId(): Promise<string> {
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) throw new Error("Farm not found");
  return farm.id;
}

interface CepeaPrice {
  date: string;
  pricePerSack: number;
  source: "cepea";
  commodity: "soy" | "corn";
}

async function scrapeCepeaIndicator(
  url: string,
  commodity: "soy" | "corn"
): Promise<CepeaPrice | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // CEPEA indicator pages have a table with dates and prices
    // The table typically has class "imagenet-content" or is in a specific container
    const rows = $("table.imagenet-content tbody tr, table.responsive tbody tr, #imagenet-content table tbody tr");

    if (rows.length === 0) {
      // Try alternative selectors
      const altRows = $("table tbody tr");
      if (altRows.length === 0) return null;

      // Get the first data row (most recent)
      const firstRow = altRows.first();
      const cells = firstRow.find("td");
      if (cells.length < 2) return null;

      const dateText = $(cells[0]).text().trim();
      const priceText = $(cells[1]).text().trim();

      const price = parseFloat(
        priceText.replace(/[^\d,.-]/g, "").replace(",", ".")
      );
      if (isNaN(price)) return null;

      // Parse date DD/MM/YYYY
      const dateParts = dateText.split("/");
      const isoDate =
        dateParts.length === 3
          ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
          : new Date().toISOString().split("T")[0];

      return { date: isoDate, pricePerSack: price, source: "cepea", commodity };
    }

    // Get most recent row
    const firstRow = rows.first();
    const cells = firstRow.find("td");
    if (cells.length < 2) return null;

    const dateText = $(cells[0]).text().trim();
    const priceText = $(cells[1]).text().trim();

    const price = parseFloat(
      priceText.replace(/[^\d,.-]/g, "").replace(",", ".")
    );
    if (isNaN(price)) return null;

    const dateParts = dateText.split("/");
    const isoDate =
      dateParts.length === 3
        ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
        : new Date().toISOString().split("T")[0];

    return { date: isoDate, pricePerSack: price, source: "cepea", commodity };
  } catch (error) {
    console.error(`CEPEA scrape error for ${commodity}:`, error);
    return null;
  }
}

export async function fetchCepeaSoyPrice(): Promise<CepeaPrice | null> {
  return scrapeCepeaIndicator(
    "https://www.cepea.esalq.usp.br/br/indicador/soja.aspx",
    "soy"
  );
}

export async function fetchCepeaCornPrice(): Promise<CepeaPrice | null> {
  return scrapeCepeaIndicator(
    "https://www.cepea.esalq.usp.br/br/indicador/milho.aspx",
    "corn"
  );
}

/** Store a price in the DB if not already stored for that date */
export async function storeCepeaPrice(
  price: CepeaPrice
): Promise<void> {
  const farmId = await getFarmId();

  // Check if we already have this date
  const existing = await db
    .select({ id: commodityPrices.id })
    .from(commodityPrices)
    .where(
      and(
        eq(commodityPrices.farmId, farmId),
        eq(commodityPrices.source, "cepea"),
        eq(commodityPrices.commodity, price.commodity),
        eq(commodityPrices.date, price.date)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(commodityPrices).values({
    farmId,
    source: "cepea",
    commodity: price.commodity,
    date: price.date,
    pricePerSack: price.pricePerSack.toFixed(2),
    unit: "R$/saca 60kg",
    fetchedAt: new Date(),
  });
}

/** Get cached price or fetch from CEPEA */
export async function getCachedOrFetchCepea(
  commodity: "soy" | "corn"
): Promise<CepeaPrice | null> {
  const farmId = await getFarmId();
  const today = new Date().toISOString().split("T")[0];

  // Check if we have today's price
  const cached = await db
    .select()
    .from(commodityPrices)
    .where(
      and(
        eq(commodityPrices.farmId, farmId),
        eq(commodityPrices.source, "cepea"),
        eq(commodityPrices.commodity, commodity),
        eq(commodityPrices.date, today)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return {
      date: cached[0].date,
      pricePerSack: parseFloat(cached[0].pricePerSack ?? "0"),
      source: "cepea",
      commodity,
    };
  }

  // Fetch from CEPEA
  const fetcher =
    commodity === "soy" ? fetchCepeaSoyPrice : fetchCepeaCornPrice;
  const price = await fetcher();

  if (price) {
    await storeCepeaPrice(price);
  }

  return price;
}

/** Get last N days of prices from DB */
export async function getLatestCepeaPrices(
  commodity: "soy" | "corn",
  days: number = 30
): Promise<Array<{ date: string; pricePerSack: number }>> {
  const farmId = await getFarmId();

  const prices = await db
    .select({
      date: commodityPrices.date,
      pricePerSack: commodityPrices.pricePerSack,
    })
    .from(commodityPrices)
    .where(
      and(
        eq(commodityPrices.farmId, farmId),
        eq(commodityPrices.source, "cepea"),
        eq(commodityPrices.commodity, commodity)
      )
    )
    .orderBy(desc(commodityPrices.date))
    .limit(days);

  return prices.map((p) => ({
    date: p.date,
    pricePerSack: parseFloat(p.pricePerSack ?? "0"),
  }));
}
