"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wheat,
  DollarSign,
  ClipboardList,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  userRole: "owner" | "consultant";
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    { title: "Painel", href: "/", icon: LayoutDashboard },
    { title: "Safras", href: "/safras", icon: Wheat },
    ...(userRole === "owner"
      ? [{ title: "Financeiro", href: "/financeiro", icon: DollarSign }]
      : []),
    { title: "Consultoria", href: "/consultoria", icon: ClipboardList },
    { title: "Agente", href: "/agente", icon: Bot },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
