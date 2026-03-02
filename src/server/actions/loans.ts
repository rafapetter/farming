"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { loans, farms } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { loanFormSchema } from "@/lib/validations";

export async function createLoan(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = loanFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  await db.insert(loans).values({
    farmId: farm.id,
    description: data.description,
    bank: data.bank || null,
    totalAmount: String(data.totalAmount),
    amountPayable: data.amountPayable ? String(data.amountPayable) : null,
    interestRate: data.interestRate ? String(data.interestRate) : null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    status: data.status,
    notes: data.notes || null,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function updateLoan(loanId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = loanFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await db.update(loans).set({
    description: data.description,
    bank: data.bank || null,
    totalAmount: String(data.totalAmount),
    amountPayable: data.amountPayable ? String(data.amountPayable) : null,
    interestRate: data.interestRate ? String(data.interestRate) : null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    status: data.status,
    notes: data.notes || null,
  }).where(eq(loans.id, loanId));

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function deleteLoan(loanId: string) {
  await db.delete(loans).where(eq(loans.id, loanId));
  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
}
