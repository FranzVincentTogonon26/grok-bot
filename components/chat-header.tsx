"use client"

import { useState } from "react"
import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useChatDesktop } from "@/components/chat-desktop"
import { Button } from "@/components/ui/button"
import type { ChatDetail } from "@/chats/queries"

export function ChatHeader({ chat }: { chat: ChatDetail }) {
  const [editOpen, setEditOpen] = useState(false)
  const { open: desktopOpen, toggle: toggleDesktop } = useChatDesktop()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <BotDialog bot={chat.bot} open={editOpen} onOpenChange={setEditOpen} />
      <Button
        type="button"
        variant="ghost"
        className="-ml-2 h-8 min-w-0 gap-2 px-2"
        onClick={() => setEditOpen(true)}
        aria-label={`Edit ${chat.displayName}`}
      >
        <ChatAvatar seed={chat.bot.avatar} className="size-5 shrink-0" />
        <span className="truncate text-sm font-semibold">
          {chat.displayName}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        aria-label={desktopOpen ? "Close desktop panel" : "Open desktop panel"}
        aria-expanded={desktopOpen}
        aria-controls={desktopOpen ? "desktop-panel" : undefined}
        onClick={toggleDesktop}
      >
        <MonitorIcon data-icon="inline-start" />
      </Button>
    </header>
  )
}
