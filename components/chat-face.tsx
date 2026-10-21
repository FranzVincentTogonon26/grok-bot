import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatAvatar } from "@/components/group-chat-avatar"

type ChatFaceProps = {
  kind: "direct" | "group"
  /** Avatar seeds for every member, in display order. */
  seeds: string[]
  animated?: boolean
  className?: string
}

/**
 * The face for a chat list item: one bot for direct chats, the member stack for
 * group chats. Both occupy the same square.
 */
export function ChatFace({ kind, seeds, animated, className }: ChatFaceProps) {
  if (kind === "group") {
    return (
      <GroupChatAvatar
        seeds={seeds}
        animated={animated}
        className={className}
      />
    )
  }

  return (
    <ChatAvatar
      seed={seeds[0] ?? ""}
      animated={animated}
      className={className}
    />
  )
}
