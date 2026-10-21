"use client"

import dynamic from "next/dynamic"

import type { ChatParticipant } from "@/components/chat"

/**
 * The chat UI pulls in the Trigger.dev chat runtime, which is client-only and
 * heavy on the Workers memory budget. Keep it out of the server render: the
 * page shell renders immediately, then the conversation loads after hydration.
 */
const Chat = dynamic(
  () => import("@/components/chat").then((mod) => mod.Chat),
  { ssr: false, loading: () => null }
)

export function ChatLazy({
  chatId,
  kind,
  members,
  placeholder,
}: {
  chatId: string
  kind: "direct" | "group"
  members: ChatParticipant[]
  placeholder?: string
}) {
  return (
    <Chat
      chatId={chatId}
      kind={kind}
      members={members}
      placeholder={placeholder}
    />
  )
}
