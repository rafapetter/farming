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
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const creatingRef = useRef(false);

  const chatIdRef = useRef<string | null>(null);
  chatIdRef.current = chatId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages }) {
          return {
            body: {
              message: messages[messages.length - 1],
              id: chatIdRef.current,
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: chatId ?? undefined,
    messages: initialMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const refreshSessions = useCallback(async () => {
    const list = await listChatSessions();
    setSessions(list);
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
      loadChatMessages(mostRecent.id).then((msgs) => {
        const uiMessages = msgs as UIMessage[];
        if (uiMessages.length > 0) {
          setChatId(mostRecent.id);
          chatIdRef.current = mostRecent.id;
          setInitialMessages(uiMessages);
          setMessages(uiMessages);
        }
      });
    }
  }, [sessions, setMessages]);

  const startNewChat = useCallback(() => {
    setChatId(null);
    chatIdRef.current = null;
    setInitialMessages([]);
    setMessages([]);
  }, [setMessages]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      const msgs = (await loadChatMessages(sessionId)) as UIMessage[];
      setChatId(sessionId);
      chatIdRef.current = sessionId;
      setInitialMessages(msgs);
      setMessages(msgs);
    },
    [setMessages]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteChatSession(sessionId);
      if (chatId === sessionId) {
        startNewChat();
      }
      await refreshSessions();
    },
    [chatId, startNewChat, refreshSessions]
  );

  const ensureSession = useCallback(async () => {
    if (chatIdRef.current) return chatIdRef.current;
    if (creatingRef.current) return null;

    creatingRef.current = true;
    try {
      const result = await createChatSession();
      if ("id" in result && result.id) {
        const newId: string = result.id;
        setChatId(newId);
        chatIdRef.current = newId;
        return newId;
      }
    } finally {
      creatingRef.current = false;
    }
    return null;
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
