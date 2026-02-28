"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sprout,
  Send,
  Mic,
  MicOff,
  X,
  Plus,
  History,
  Paperclip,
  FileText,
} from "lucide-react";
import {
  MarkdownMessage,
  getMessageText,
} from "@/components/ai/markdown-message";
import { usePersistedChat } from "@/hooks/use-persisted-chat";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: { [i: number]: { [j: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,application/pdf";

export function ChatPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    chatId,
    sessions,
    startNewChat,
    loadSession,
    ensureSession,
  } = usePersistedChat();

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

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const currentTitle = sessions.find((s) => s.id === chatId)?.title;
  const hasContent = inputValue.trim() || attachments.length > 0;

  // Hide on the full agent page — it has its own chat UI
  if (pathname === "/agente") return null;

  return (
    <>
      {/* FAB Button - hidden when sheet is open */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:bottom-6"
          size="icon"
        >
          <Sprout className="h-6 w-6" />
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
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
                  <SheetTitle className="text-base">
                    {currentTitle ?? "Agente Fazenda"}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Gemini 3.0 Flash
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSessions(!showSessions)}
                  title="Conversas"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    startNewChat();
                    setShowSessions(false);
                  }}
                  title="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Session list overlay */}
          {showSessions ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma conversa anterior
                  </p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        chatId === session.id ? "ring-1 ring-primary" : ""
                      }`}
                      onClick={() => {
                        loadSession(session.id);
                        setShowSessions(false);
                      }}
                    >
                      <Sprout className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-sm truncate flex-1">
                        {session.title ?? "Nova conversa"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <Avatar className="h-16 w-16 mb-4">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Sprout className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold mb-2">Agente Fazenda</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Posso consultar custos, atividades, previsão de
                      produtividade, registrar gastos e muito mais.
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
                          disabled={isLoading}
                          onClick={async () => {
                            const sessionId = await ensureSession();
                            if (!sessionId) return;
                            sendMessage({ text: suggestion });
                          }}
                          className="rounded-lg border p-2 text-left text-xs hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    const fileParts = message.parts.filter(
                      (p): p is { type: "file"; mediaType: string; url: string } =>
                        p.type === "file"
                    );
                    if (!text && fileParts.length === 0) return null;
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
                          {fileParts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {fileParts.map((fp, i) =>
                                fp.mediaType.startsWith("image/") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={i}
                                    src={fp.url}
                                    alt="Anexo"
                                    className="rounded max-h-32 max-w-full object-cover"
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
                                    <span className="truncate max-w-[120px]">
                                      PDF
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          {text &&
                            (isUser ? (
                              <div className="whitespace-pre-wrap">{text}</div>
                            ) : (
                              <MarkdownMessage content={text} />
                            ))}
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

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="border-t px-4 py-2 flex flex-wrap gap-2">
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
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[80px]">{file.name}</span>
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
              <div className="border-t px-4 py-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    title="Anexar arquivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
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
                    disabled={isLoading || !hasContent}
                    onClick={handleSend}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
