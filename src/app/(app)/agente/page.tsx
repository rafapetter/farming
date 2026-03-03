"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Sprout,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  Paperclip,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MarkdownMessage,
  getMessageText,
} from "@/components/ai/markdown-message";
import { usePersistedChat } from "@/hooks/use-persisted-chat";

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,application/pdf";

export default function AgentePage() {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    status,
    chatId,
    sessions,
    startNewChat,
    loadSession,
    removeSession,
    ensureSession,
  } = usePersistedChat();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = inputValue.trim();
    if ((!text && attachments.length === 0) || isLoading) return;
    const sessionId = await ensureSession();
    if (!sessionId) return;

    if (attachments.length > 0) {
      const dt = new DataTransfer();
      attachments.forEach((f) => dt.items.add(f));
      sendMessage({ text: text || "Analise este arquivo", files: dt.files });
    } else {
      sendMessage({ text });
    }
    setInputValue("");
    setAttachments([]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.webkitSpeechRecognition && !win.SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor =
      win.webkitSpeechRecognition || win.SpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev: string) => prev + transcript);
    };
    recognition.onerror = () => setIsListening(false);

    recognition.start();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasContent = inputValue.trim() || attachments.length > 0;

  // Show session history view
  if (showHistory) {
    return (
      <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Conversas</h1>
              <p className="text-sm text-muted-foreground">
                Histórico de conversas com o agente
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              startNewChat();
              setShowHistory(false);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa anterior
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    chatId === session.id ? "ring-2 ring-primary bg-muted/30" : ""
                  }`}
                  onClick={() => {
                    loadSession(session.id);
                    setShowHistory(false);
                  }}
                >
                  <Sprout className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title ?? "Nova conversa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(session.updatedAt ?? session.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agente IA</h1>
          <p className="text-sm text-muted-foreground">
            Assistente agrícola inteligente - Gemini 3.0 Flash
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(true)}
            title="Histórico"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={startNewChat}
            title="Nova conversa"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sprout className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-sm">
                      Olá! Eu sou o <strong>Agente Fazenda</strong>, seu
                      assistente agrícola. Posso ajudar com informações sobre
                      suas safras, custos, planejamento, previsão de
                      produtividade e muito mais.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-11">
                {[
                  "Qual o custo total da safra de soja?",
                  "Quais as próximas atividades programadas?",
                  "Qual a previsão de produtividade da soja?",
                  "Resumo financeiro de janeiro 2026",
                  "Registrar gasto de R$100 em diesel",
                  "Comparar custos soja vs milho",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    disabled={isLoading}
                    onClick={async () => {
                      const sessionId = await ensureSession();
                      if (!sessionId) return;
                      sendMessage({ text: suggestion });
                    }}
                    className="rounded-lg border p-2.5 text-left text-xs hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, idx) => {
            const text = getMessageText(message);
            const fileParts = message.parts.filter(
              (p): p is { type: "file"; mediaType: string; url: string } =>
                p.type === "file"
            );
            if (!text && fileParts.length === 0) return null;
            const isUser = message.role === "user";
            const isLastAssistant =
              !isUser &&
              idx === messages.length - 1 &&
              status === "streaming";
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={
                      !isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }
                  >
                    {!isUser ? <Sprout className="h-4 w-4" /> : "EU"}
                  </AvatarFallback>
                </Avatar>
                <Card
                  className={`max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <CardContent className="p-3">
                    {fileParts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {fileParts.map((fp, i) =>
                          fp.mediaType.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={fp.url}
                              alt="Anexo"
                              className="rounded max-h-40 max-w-full object-cover"
                            />
                          ) : (
                            <div
                              key={i}
                              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                                isUser
                                  ? "border-primary-foreground/30"
                                  : "border-border"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span>PDF</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {text &&
                      (isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{text}</p>
                      ) : (
                        <MarkdownMessage
                          content={text}
                          className="text-sm"
                          isStreaming={isLastAssistant}
                        />
                      ))}
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {isLoading &&
            !(
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              getMessageText(messages[messages.length - 1])
            ) && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sprout className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="relative flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1 text-xs"
            >
              {file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 flex items-end gap-2 border-t pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          onClick={toggleVoice}
          className="shrink-0"
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre suas safras, custos, planejamento..."
          className="min-h-[2.5rem] max-h-32 resize-none"
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          disabled={!hasContent || isLoading}
          onClick={handleSend}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
