"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sprout, Send, Mic, MicOff, X } from "lucide-react";
import { MarkdownMessage, getMessageText } from "@/components/ai/markdown-message";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor =
      win.webkitSpeechRecognition || win.SpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleSend() {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:bottom-6"
        size="icon"
      >
        <Sprout className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sprout className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-base">Agente Fazenda</SheetTitle>
                  <p className="text-xs text-muted-foreground">Gemini 2.0 Flash</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Sprout className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold mb-2">Agente Fazenda</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Posso consultar custos, atividades, previsão de produtividade,
                  registrar gastos e muito mais.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {[
                    "Qual o custo total da soja?",
                    "Quais as próximas atividades?",
                    "Qual a previsão de produtividade?",
                    "Resumo financeiro de janeiro",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        sendMessage({ text: suggestion });
                      }}
                      className="rounded-lg border p-2 text-left text-xs hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message) => {
                const text = getMessageText(message);
                if (!text) return null;
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                  >
                    {!isUser && (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <Sprout className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{text}</div>
                      ) : (
                        <MarkdownMessage content={text} />
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Sprout className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant={isListening ? "destructive" : "ghost"}
                size="icon"
                className="shrink-0"
                onClick={toggleVoice}
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
                onKeyDown={onKeyDown}
                placeholder="Pergunte sobre custos, atividades, previsão..."
                rows={1}
                className="min-h-[40px] max-h-[120px] resize-none"
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0"
                disabled={isLoading || !inputValue.trim()}
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
