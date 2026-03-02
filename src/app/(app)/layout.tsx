import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { ChatPanel } from "@/components/ai/chat-panel";
import { getNotificationData } from "@/server/actions/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };

  let notificationData;
  try {
    notificationData = await getNotificationData();
  } catch {
    notificationData = { pendingPayments: 0, upcomingActivities: [] };
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <TopBar notificationData={notificationData} />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </SidebarInset>
      <BottomNav userRole={user.role} />
      <ChatPanel />
    </SidebarProvider>
  );
}
