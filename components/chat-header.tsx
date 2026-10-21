"use client"

import { useState } from "react"
import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { useChatDesktop } from "@/components/chat-desktop"
import { Button } from "@/components/ui/button"
import type { ChatDetail } from "@/chats/queries"

type ChatMember = ChatDetail["members"][number]

export function ChatHeader({ chat }: { chat: ChatDetail }) {
  if (chat.kind === "group" || !chat.bot) {
    return <GroupChatHeader chat={chat} />
  }

  return <DirectChatHeader chat={chat} bot={chat.bot} />
}

function DirectChatHeader({
  chat,
  bot,
}: {
  chat: ChatDetail
  bot: ChatMember
}) {
  const [editOpen, setEditOpen] = useState(false)
  const { open: desktopOpen, toggle: toggleDesktop } = useChatDesktop()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <BotDialog bot={bot} open={editOpen} onOpenChange={setEditOpen} />
      <Button
        type="button"
        variant="ghost"
        className="-ml-2 h-8 min-w-0 gap-2 px-2"
        onClick={() => setEditOpen(true)}
        aria-label={`Edit ${chat.displayName}`}
      >
        <ChatAvatar seed={bot.avatar} className="size-5 shrink-0" />
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

/**
 * Group chats have no single editable bot and no desktop panel, so the header
 * is a static group face and name.
 */
function GroupChatHeader({ chat }: { chat: ChatDetail }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <div className="-ml-2 flex h-8 min-w-0 items-center gap-2 px-2">
        <GroupChatAvatar
          seeds={chat.members.map((member) => member.avatar)}
          className="size-5 shrink-0"
        />
        <span className="truncate text-sm font-semibold">
          {chat.displayName}
        </span>
      </div>
    </header>
  )
}
