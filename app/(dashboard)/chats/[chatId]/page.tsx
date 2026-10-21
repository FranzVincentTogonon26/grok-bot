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

  // Remount the whole subtree per chat so the header's edit dialog state, the
  // desktop panel state, and the in-memory conversation never leak across
  // sibling chat navigations.
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
