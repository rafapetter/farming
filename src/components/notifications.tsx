"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, DollarSign, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface NotificationData {
  pendingPayments: number;
  upcomingActivities: Array<{ title: string; date: string | null; seasonId: string }>;
}

export function Notifications({ data }: { data: NotificationData }) {
  const count =
    (data.pendingPayments > 0 ? 1 : 0) + (data.upcomingActivities.length > 0 ? 1 : 0);

  if (count === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {count}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Notificações</p>

          {data.pendingPayments > 0 && (
            <Link href="/financeiro" className="block">
              <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Pagamentos pendentes</p>
                  <p className="text-xs text-muted-foreground">
                    {data.pendingPayments.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    em aberto
                  </p>
                </div>
              </div>
            </Link>
          )}

          {data.upcomingActivities.length > 0 && (
            <Link
              href={`/safras/${data.upcomingActivities[0].seasonId}/planejamento`}
              className="block"
            >
              <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">
                    {data.upcomingActivities.length} atividade(s) próxima(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.upcomingActivities
                      .slice(0, 3)
                      .map((a) => a.title)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
