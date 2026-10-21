import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getBotOptions, getSidebarChats } from "@/queries/bots"

/**
 * SidebarProvider writes every toggle to this cookie (see
 * components/ui/sidebar.tsx). Read it here so the server-rendered first
 * paint already matches the rail state the user left.
 */
const SIDEBAR_COOKIE_NAME = "sidebar_state"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [chats, bots, cookieStore] = await Promise.all([
    getSidebarChats(),
    getBotOptions(),
    cookies(),
  ])
  // Absent cookie (first visit) -> expanded, matching the primitive's
  // own default; only the explicit "false" left by a collapse starts closed.
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false"

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="h-svh overflow-hidden"
    >
      <AppSidebar chats={chats} bots={bots} />
      <SidebarInset className="min-h-0 overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
