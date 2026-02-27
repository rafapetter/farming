"use server";

import { db } from "@/server/db";
import { chatSessions, farms } from "@/server/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function createChatSession() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const [farm] = await db.select({ id: farms.id }).from(farms).limit(1);
  if (!farm) return { error: "Fazenda não encontrada" };

  const [newSession] = await db
    .insert(chatSessions)
    .values({
      userId: session.user.id,
      farmId: farm.id,
    })
    .returning();

  return { id: newSession.id };
}

export async function listChatSessions() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const sessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      updatedAt: chatSessions.updatedAt,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, session.user.id))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(20);

  return sessions;
}

export async function loadChatMessages(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const [chatSession] = await db
    .select({ messages: chatSessions.messages, userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!chatSession || chatSession.userId !== session.user.id) return [];

  return (chatSession.messages as unknown[]) ?? [];
}

export async function deleteChatSession(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const [chatSession] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!chatSession || chatSession.userId !== session.user.id) {
    return { error: "Sessão não encontrada" };
  }

  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
  return { success: true };
}
