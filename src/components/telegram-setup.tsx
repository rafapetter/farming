"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Send, ExternalLink, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import {
  getTelegramStatus,
  setupTelegramWebhook,
  sendTelegramTestMessage,
  unlinkTelegram,
} from "@/server/actions/telegram";

interface TelegramLink {
  id: string;
  chatId: string;
  username: string | null;
  active: boolean;
}

interface TelegramSetupProps {
  links: TelegramLink[];
}

export function TelegramSetup({ links: initialLinks }: TelegramSetupProps) {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [links, setLinks] = useState(initialLinks);

  useEffect(() => {
    getTelegramStatus().then((status) => {
      setConfigured(status.configured);
      setBotUsername(status.botUsername);
      setLoading(false);
    });
  }, []);

  const handleSetupWebhook = async () => {
    setSettingUp(true);
    setMessage(null);
    const result = await setupTelegramWebhook();
    setMessage({
      text: result.message,
      type: result.success ? "success" : "error",
    });
    setSettingUp(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    const result = await sendTelegramTestMessage();
    setMessage({
      text: result.message,
      type: result.success ? "success" : "error",
    });
    setTesting(false);
  };

  const handleUnlink = async (linkId: string) => {
    const result = await unlinkTelegram(linkId);
    if (result.success) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Telegram</CardTitle>
          </div>
          <CardDescription>Notificações via Telegram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando configuração...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Telegram</CardTitle>
        </div>
        <CardDescription>Notificações via Telegram</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured ? (
          <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
            <XCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Bot não configurado. Adicione a variável{" "}
              <code className="bg-muted px-1 rounded text-xs">
                TELEGRAM_BOT_TOKEN
              </code>{" "}
              nas variáveis de ambiente.
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Setup webhook */}
            <div className="space-y-2">
              <p className="text-sm font-medium">1. Configurar Webhook</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSetupWebhook}
                  disabled={settingUp}
                >
                  {settingUp && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Ativar Webhook
                </Button>
                {links.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ativo
                  </Badge>
                )}
              </div>
            </div>

            {/* Step 2: Open bot */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                2. Conectar no Telegram
              </p>
              {botUsername ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Abrir @{botUsername}
                    </Button>
                  </a>
                  <span className="text-xs text-muted-foreground">
                    Clique em &quot;Start&quot; no Telegram para vincular
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Envie{" "}
                  <code className="bg-muted px-1 rounded text-xs">/start</code>{" "}
                  para o bot no Telegram para vincular.
                </p>
              )}
            </div>

            {/* Step 3: Test */}
            <div className="space-y-2">
              <p className="text-sm font-medium">3. Testar Conexão</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTest}
                disabled={testing || links.length === 0}
              >
                {testing && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Enviar Mensagem de Teste
              </Button>
            </div>

            {/* Linked chats */}
            {links.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">Chats Vinculados</p>
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        @{link.username || link.chatId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Chat ID: {link.chatId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={link.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {link.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleUnlink(link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-md p-2 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
