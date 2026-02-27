import { auth } from "@/lib/auth";
import { fetchForecastRain, getMergedRainData } from "@/lib/rain-api";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  try {
    if (type === "forecast") {
      const data = await fetchForecastRain();
      return Response.json({ data });
    }

    if (type === "historical" && startDate && endDate) {
      const data = await getMergedRainData(startDate, endDate);
      return Response.json({ data });
    }

    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  } catch {
    return Response.json(
      { error: "Failed to fetch rain data" },
      { status: 500 }
    );
  }
}
