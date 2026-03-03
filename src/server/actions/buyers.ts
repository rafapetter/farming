"use server";

import { db } from "@/server/db";
import { buyers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createBuyer(formData: FormData) {
  const farmId = formData.get("farmId") as string;
  const name = formData.get("name") as string;
  const company = (formData.get("company") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const location = (formData.get("location") as string) || null;
  const commoditiesRaw = formData.get("commodities") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!farmId || !name) {
    return { error: "Nome é obrigatório" };
  }

  const commodities = commoditiesRaw
    ? commoditiesRaw.split(",").map((c) => c.trim())
    : ["soy"];

  await db.insert(buyers).values({
    farmId,
    name,
    company,
    phone,
    email,
    location,
    commodities,
    notes,
    lastContactDate: new Date().toISOString().split("T")[0],
  });

  revalidatePath("/mercado");
  return { success: true };
}

export async function updateBuyer(buyerId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const company = (formData.get("company") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const location = (formData.get("location") as string) || null;
  const commoditiesRaw = formData.get("commodities") as string;
  const notes = (formData.get("notes") as string) || null;
  const active = formData.get("active") !== "false";

  const commodities = commoditiesRaw
    ? commoditiesRaw.split(",").map((c) => c.trim())
    : undefined;

  await db
    .update(buyers)
    .set({
      name,
      company,
      phone,
      email,
      location,
      ...(commodities && { commodities }),
      notes,
      active,
    })
    .where(eq(buyers.id, buyerId));

  revalidatePath("/mercado");
  return { success: true };
}

export async function deleteBuyer(buyerId: string) {
  await db.delete(buyers).where(eq(buyers.id, buyerId));
  revalidatePath("/mercado");
  return { success: true };
}
