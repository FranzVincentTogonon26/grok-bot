import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"

import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
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
    <main className="flex min-h-svh">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <ChatAvatar seed={seed} animated className="size-16 rounded-full" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-semibold">
            Meet your first bot
          </EmptyTitle>
          <EmptyDescription>
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary" className="rounded-full">
            <PlusIcon data-icon="inline-start" />
            Create a new bot
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
