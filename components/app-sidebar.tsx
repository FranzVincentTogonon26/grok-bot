"use client"

import { useState } from "react"
import { UserButton } from "@clerk/nextjs"
import { differenceInSeconds, formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersRound } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { SidebarChat } from "@/queries/bots"

/**
 * Trigger/box/avatar styling lives in app/globals.css (cl-userButton*
 * selectors, scoped to [data-clerk-component="UserButton"]); the UI is
 * pinned via <ClerkProvider ui={ui}> to keep those classes stable.
 *
 * rootBox here is the one element whose classes reliably land on the
 * mount host — a grid there stretches the trigger to the full menu-item
 * width (its roundWrapper variant sets width: unset, i.e. fit-content).
 */
const userButtonAppearance = {
  elements: {
    rootBox: "h-8 w-full! min-w-0! grid! items-center! justify-items-stretch!",
  },
}

/**
 * "2 days", "now" — strict units, no "ago" suffix.
 */
function formatChatTime(date: Date) {
  if (differenceInSeconds(new Date(), date) < 60) return "now"
  return formatDistanceToNowStrict(date)
}

function ChatMenuItem({ chat }: { chat: SidebarChat }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg">
        <ChatAvatar seed={chat.botAvatar} className="size-10 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{chat.displayName}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatChatTime(chat.lastMessageAt)}
            </span>
          </div>
          {chat.lastMessagePreview && (
            <span className="truncate text-xs text-muted-foreground">
              {chat.lastMessagePreview}
            </span>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ chats }: { chats: SidebarChat[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)

  return (
    <>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <Sidebar>
        <SidebarHeader className="items-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-xl"
                  aria-label="Create chat"
                />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                <PlusIcon />
                Create new bot
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UsersRound />
                Create group chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarHeader>
        <SidebarContent>
          {chats.length > 0 && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {chats.map((chat) => (
                    <ChatMenuItem key={chat.id} chat={chat} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton showName appearance={userButtonAppearance} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
