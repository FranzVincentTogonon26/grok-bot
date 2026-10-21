import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { getChatById } from "@/chats/queries"
import {
  ChatDesktopPanel,
  ChatDesktopProvider,
} from "@/components/chat-desktop"
import { ChatHeader } from "@/components/chat-header"
import { ChatLazy } from "@/components/chat-lazy"
import { SandboxDesktopProvider } from "@/components/sandbox-desktop"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()
  const { chatId } = await params

  const chat = await getChatById(chatId)
  if (!chat) notFound()

  const members = chat.members.map(({ id, name, avatar }) => ({
    id,
    name,
    avatar,
  }))

  // Group chats have no bot-specific desktop panel and no single editable bot.
  // Remount the subtree per chat so the conversation state never leaks across
  // sibling chat navigations.
  if (chat.kind === "group") {
    return (
      <div
        key={chat.id}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <ChatHeader chat={chat} />
        <ChatLazy
          chatId={chat.id}
          kind="group"
          members={members}
          placeholder={`Message ${chat.displayName}...`}
        />
      </div>
    )
  }

  if (!chat.bot) notFound()

  return (
    <ChatDesktopProvider key={chat.id}>
      <SandboxDesktopProvider chatId={chat.id} botName={chat.bot.name}>
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <ResizablePanel id="chat" className="min-w-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <ChatHeader chat={chat} />
              <ChatLazy
                chatId={chat.id}
                kind="direct"
                members={members}
                placeholder={`Message ${chat.displayName}...`}
              />
            </div>
          </ResizablePanel>
          <ChatDesktopPanel />
        </ResizablePanelGroup>
      </SandboxDesktopProvider>
    </ChatDesktopProvider>
  )
}
