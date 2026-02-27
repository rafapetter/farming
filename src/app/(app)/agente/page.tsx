"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Mic, MicOff, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownMessage, getMessageText } from "@/components/ai/markdown-message";

export default function AgentePage() {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
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

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Agente IA</h1>
        <p className="text-sm text-muted-foreground">
          Assistente agrícola inteligente - Gemini 2.0 Flash
        </p>
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
                      Olá! Eu sou o <strong>Agente Fazenda</strong>, seu assistente agrícola.
                      Posso ajudar com informações sobre suas safras, custos,
                      planejamento, previsão de produtividade e muito mais.
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
                    onClick={() => sendMessage({ text: suggestion })}
                    className="rounded-lg border p-2.5 text-left text-xs hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => {
            const text = getMessageText(message);
            if (!text) return null;
            const isUser = message.role === "user";
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
                    {!isUser ? (
                      <Sprout className="h-4 w-4" />
                    ) : (
                      "EU"
                    )}
                  </AvatarFallback>
                </Avatar>
                <Card
                  className={`max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <CardContent className="p-3">
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap">{text}</p>
                    ) : (
                      <MarkdownMessage content={text} className="text-sm" />
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {isLoading && (
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

      {/* Input */}
      <div className="mt-4 flex items-end gap-2 border-t pt-4">
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
          disabled={!inputValue.trim() || isLoading}
          onClick={handleSend}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
