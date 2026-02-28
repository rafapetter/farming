"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import {
  createChatSession,
  loadChatMessages,
  listChatSessions,
  deleteChatSession,
} from "@/server/actions/chat";

export type ChatSession = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
  createdAt: Date;
};

export function usePersistedChat() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const pendingCreation = useRef<Promise<string | null> | null>(null);

  // chatIdRef is the source of truth for the transport layer.
  // It is managed independently from chatId state to avoid
  // useChat re-creating its internal Chat instance mid-send.
  const chatIdRef = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ chatId: chatIdRef.current }),
      }),
    []
  );

  // No `id` prop — single chat instance that we manage via setMessages.
  // This prevents useChat from switching instances when chatId changes.
  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listChatSessions();
      setSessions(list);
    } catch {
      // ignore - may fail if user session is invalid
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Load the most recent session on first mount
  const loadedInitial = useRef(false);
  useEffect(() => {
    if (loadedInitial.current || sessions.length === 0) return;
    loadedInitial.current = true;
    const mostRecent = sessions[0];
    if (mostRecent) {
      loadChatMessages(mostRecent.id)
        .then((msgs) => {
          const uiMessages = msgs as UIMessage[];
          if (uiMessages.length > 0) {
            chatIdRef.current = mostRecent.id;
            setChatId(mostRecent.id);
            setMessages(uiMessages);
          }
        })
        .catch(() => {
          // ignore load errors
        });
    }
  }, [sessions, setMessages]);

  const startNewChat = useCallback(() => {
    chatIdRef.current = null;
    setChatId(null);
    setMessages([]);
  }, [setMessages]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      const msgs = (await loadChatMessages(sessionId)) as UIMessage[];
      chatIdRef.current = sessionId;
      setChatId(sessionId);
      setMessages(msgs);
    },
    [setMessages]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteChatSession(sessionId);
      if (chatIdRef.current === sessionId) {
        startNewChat();
      }
      await refreshSessions();
    },
    [startNewChat, refreshSessions]
  );

  const ensureSession = useCallback(async () => {
    if (chatIdRef.current) return chatIdRef.current;
    if (pendingCreation.current) return pendingCreation.current;

    pendingCreation.current = (async () => {
      try {
        const result = await createChatSession();
        if ("id" in result && result.id) {
          chatIdRef.current = result.id;
          setChatId(result.id);
          return result.id;
        }
        return null;
      } finally {
        pendingCreation.current = null;
      }
    })();

    return pendingCreation.current;
  }, []);

  // Refresh sessions after a response completes
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "streaming" && status === "ready") {
      refreshSessions();
    }
    prevStatus.current = status;
  }, [status, refreshSessions]);

  return {
    messages,
    sendMessage,
    status,
    isLoading,
    chatId,
    sessions,
    startNewChat,
    loadSession,
    removeSession,
    refreshSessions,
    ensureSession,
  };
}
