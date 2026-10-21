"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import type { chatAgent } from "@/trigger/chat"

export function Chat({
  chatId,
  placeholder,
}: {
  chatId: string
  placeholder?: string
}) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })

  // Mount the conversation only once the persisted transcript is in hand, so
  // useChat starts from the same history the transport resumes from.
  const { messages, isLoading } = useLoadTranscript(
    chatId,
    loadChatTranscript,
    { transport }
  )

  if (isLoading) return null

  return (
    <ChatConversation
      key={chatId}
      chatId={chatId}
      initialMessages={messages}
      transport={transport}
      placeholder={placeholder}
    />
  )
}

function ChatConversation({
  chatId,
  initialMessages,
  transport,
  placeholder,
}: {
  chatId: string
  initialMessages: UIMessage[]
  transport: TriggerChatTransport
  placeholder?: string
}) {
  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim()
    if (!text) return
    sendMessage({ text })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Send a message below to start the conversation."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4">
        {error && (
          <p className="mb-2 text-sm text-destructive">
            {error.message || "Something went wrong."}
          </p>
        )}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder={placeholder} />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
