import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { getChatById } from "@/chats/queries"
import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()
  const { chatId } = await params

  const chat = await getChatById(chatId)
  if (!chat) notFound()

  // Remount the whole subtree per chat so the header's edit dialog state and
  // the in-memory conversation never leak across sibling chat navigations.
  return (
    <div key={chat.id} className="flex min-h-0 flex-1 flex-col">
      <ChatHeader chat={chat} />
      <Chat placeholder={`Message ${chat.displayName}...`} />
    </div>
  )
}
