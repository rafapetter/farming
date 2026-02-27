"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { consultingVisits, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { consultingVisitFormSchema } from "@/lib/validations";

export async function createConsultingVisit(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const raw = Object.fromEntries(formData);
  const parsed = consultingVisitFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(consultingVisits).values({
    farmId: farm.id,
    consultantId: session.user.id,
    visitDate: data.visitDate,
    activities: data.activities,
    recommendations: data.recommendations || null,
  });

  revalidatePath("/consultoria");
  return { success: true };
}

export async function deleteConsultingVisit(visitId: string) {
  await db.delete(consultingVisits).where(eq(consultingVisits.id, visitId));
  revalidatePath("/consultoria");
}
