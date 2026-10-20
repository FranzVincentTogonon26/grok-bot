"use client"

import { useState } from "react"
import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatDetail } from "@/chats/queries"

export function ChatHeader({ chat }: { chat: ChatDetail }) {
  const [editOpen, setEditOpen] = useState(false)

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
      {/* Presentational for now — wires up to a desktop app later. */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        aria-label="Open desktop app"
      >
        <MonitorIcon />
      </Button>
    </header>
  )
}
