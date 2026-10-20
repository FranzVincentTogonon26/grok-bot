import { auth } from "@clerk/nextjs/server"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  // Server-side per request, so every refresh shows a different bot face.
  const seed = crypto.randomUUID()

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <ChatAvatar seed={seed} animated className="size-16 rounded-full" />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">
          Meet your first bot
        </EmptyTitle>
        <EmptyDescription>
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <BotDialog />
      </EmptyContent>
    </Empty>
  )
}
