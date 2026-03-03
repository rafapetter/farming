import { db } from "@/server/db";
import { commodityPrices, farms } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function getFarmId(): Promise<string> {
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) throw new Error("Farm not found");
  return farm.id;
}

interface ExchangeRate {
  date: string;
  buyRate: number;
  sellRate: number;
}

/** Fetch BRL/USD exchange rate from BCB (Banco Central do Brasil) PTAX API */
export async function fetchExchangeRate(): Promise<ExchangeRate | null> {
  try {
    // BCB PTAX - last closing rate
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7); // Look back 7 days for holidays

    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${fmt(startDate)}'&@dataFinalCotacao='${fmt(today)}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;

    const response = await fetch(url, { next: { revalidate: 0 } });
    if (!response.ok) return null;

    const data = await response.json();
    const entry = data?.value?.[0];
    if (!entry) return null;

    return {
      date: entry.dataHoraCotacao?.split("T")[0] ?? today.toISOString().split("T")[0],
      buyRate: entry.cotacaoCompra ?? 0,
      sellRate: entry.cotacaoVenda ?? 0,
    };
  } catch (error) {
    console.error("Exchange rate fetch error:", error);
    return null;
  }
}

interface FuturesPrice {
  date: string;
  priceDollar: number; // USD per bushel
  pricePerSack: number; // Converted to R$/sack
  commodity: "soy" | "corn";
}

/** Convert USD/bushel to R$/sack (60kg)
 * 1 bushel of soy = 27.2155 kg
 * 1 sack = 60 kg ≈ 2.2046 bushels of soy
 * 1 bushel of corn = 25.4012 kg
 * 1 sack = 60 kg ≈ 2.3622 bushels of corn
 */
function usdBushelToRsSack(
  usdPerBushel: number,
  exchangeRate: number,
  commodity: "soy" | "corn"
): number {
  const bushelsPerSack = commodity === "soy" ? 60 / 27.2155 : 60 / 25.4012;
  return usdPerBushel * bushelsPerSack * exchangeRate;
}

/** Fetch soy futures from Yahoo Finance */
async function fetchYahooFutures(
  ticker: string,
  commodity: "soy" | "corn"
): Promise<{ priceDollar: number } | null> {
  try {
    // Use Yahoo Finance v8 chart API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const quote = data?.chart?.result?.[0]?.meta;
    const price = quote?.regularMarketPrice ?? quote?.previousClose;

    if (!price || typeof price !== "number") return null;
    // Yahoo Finance CBOT futures are quoted in cents/bushel — convert to USD/bushel
    const priceInDollars = price / 100;
    return { priceDollar: priceInDollars };
  } catch (error) {
    console.error(`Yahoo futures error for ${commodity}:`, error);
    return null;
  }
}

export async function fetchSoyFutures(): Promise<FuturesPrice | null> {
  const [yahooData, exchangeData] = await Promise.all([
    fetchYahooFutures("ZS=F", "soy"),
    fetchExchangeRate(),
  ]);

  if (!yahooData) return null;

  const rate = exchangeData?.sellRate ?? 5.0;
  const today = new Date().toISOString().split("T")[0];

  return {
    date: today,
    priceDollar: yahooData.priceDollar,
    pricePerSack: usdBushelToRsSack(yahooData.priceDollar, rate, "soy"),
    commodity: "soy",
  };
}

export async function fetchCornFutures(): Promise<FuturesPrice | null> {
  const [yahooData, exchangeData] = await Promise.all([
    fetchYahooFutures("ZC=F", "corn"),
    fetchExchangeRate(),
  ]);

  if (!yahooData) return null;

  const rate = exchangeData?.sellRate ?? 5.0;
  const today = new Date().toISOString().split("T")[0];

  return {
    date: today,
    priceDollar: yahooData.priceDollar,
    pricePerSack: usdBushelToRsSack(yahooData.priceDollar, rate, "corn"),
    commodity: "corn",
  };
}

/** Store futures price in DB */
export async function storeFuturesPrice(
  price: FuturesPrice
): Promise<void> {
  const farmId = await getFarmId();

  const existing = await db
    .select({ id: commodityPrices.id })
    .from(commodityPrices)
    .where(
      and(
        eq(commodityPrices.farmId, farmId),
        eq(commodityPrices.source, "cbot"),
        eq(commodityPrices.commodity, price.commodity),
        eq(commodityPrices.date, price.date)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(commodityPrices).values({
    farmId,
    source: "cbot",
    commodity: price.commodity,
    date: price.date,
    pricePerSack: price.pricePerSack.toFixed(2),
    priceDollar: price.priceDollar.toFixed(4),
    unit: "USD/bushel → R$/saca",
    fetchedAt: new Date(),
  });
}

/** Get latest CBOT prices from DB */
export async function getLatestFuturesPrices(
  commodity: "soy" | "corn",
  days: number = 30
): Promise<
  Array<{ date: string; pricePerSack: number; priceDollar: number }>
> {
  const farmId = await getFarmId();

  const prices = await db
    .select({
      date: commodityPrices.date,
      pricePerSack: commodityPrices.pricePerSack,
      priceDollar: commodityPrices.priceDollar,
    })
    .from(commodityPrices)
    .where(
      and(
        eq(commodityPrices.farmId, farmId),
        eq(commodityPrices.source, "cbot"),
        eq(commodityPrices.commodity, commodity)
      )
    )
    .orderBy(desc(commodityPrices.date))
    .limit(days);

  return prices.map((p) => ({
    date: p.date,
    pricePerSack: parseFloat(p.pricePerSack ?? "0"),
    priceDollar: parseFloat(p.priceDollar ?? "0"),
  }));
}
