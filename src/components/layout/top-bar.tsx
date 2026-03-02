"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Notifications } from "@/components/notifications";

interface TopBarProps {
  title?: string;
  notificationData?: {
    pendingPayments: number;
    upcomingActivities: Array<{ title: string; date: string | null; seasonId: string }>;
  };
}

export function TopBar({ title, notificationData }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      {title && <h1 className="text-sm font-semibold">{title}</h1>}
      <div className="ml-auto flex items-center gap-1">
        {notificationData && <Notifications data={notificationData} />}
        <ThemeToggle />
      </div>
    </header>
  );
}
