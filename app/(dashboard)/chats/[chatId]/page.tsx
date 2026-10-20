import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { getChatById } from "@/chats/queries"
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

  // Remount per chat so the header's edit dialog state (seed, form) never
  // leaks across sibling chat navigations.
  return <ChatHeader key={chat.id} chat={chat} />
}
