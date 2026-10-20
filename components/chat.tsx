"use client"

import { useChat } from "@ai-sdk/react"

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

export function Chat({ placeholder }: { placeholder?: string }) {
  const { messages, sendMessage, status, stop, error } = useChat()

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
                      <MessageResponse key={index}>
                        {part.text}
                      </MessageResponse>
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
