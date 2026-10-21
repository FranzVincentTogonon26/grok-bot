"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
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
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Terminal } from "@/components/ai-elements/terminal"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool"
import { ChatAvatar } from "@/components/chat-avatar"
import type { chatAgent } from "@/trigger/chat"

const TOOL_TITLES: Record<string, string> = {
  bash: "Bash",
  readFile: "Read file",
  writeFile: "Write file",
  listFiles: "List files",
  mouseClick: "Mouse click",
  mouseMove: "Mouse move",
  mouseScroll: "Mouse scroll",
  mouseDrag: "Mouse drag",
  keyboardType: "Keyboard type",
  keyboardPress: "Keyboard press",
  keyboardHotkey: "Keyboard hotkey",
  viewScreen: "View screen",
  showScreen: "Show screen",
}

const SCREEN_TOOLS = new Set(["viewScreen", "showScreen"])

export type ChatParticipant = {
  id: string
  name: string
  avatar: string
}

export function Chat({
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
      kind={kind}
      members={members}
      initialMessages={messages}
      transport={transport}
      placeholder={placeholder}
    />
  )
}

function ChatConversation({
  chatId,
  kind,
  members,
  initialMessages,
  transport,
  placeholder,
}: {
  chatId: string
  kind: "direct" | "group"
  members: ChatParticipant[]
  initialMessages: UIMessage[]
  transport: TriggerChatTransport
  placeholder?: string
}) {
  const [selectedBotId, setSelectedBotId] = useState(members[0]?.id ?? "")
  const selectedBot =
    members.find((member) => member.id === selectedBotId) ?? members[0]

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim()
    if (!text) return

    if (kind === "group" && selectedBot) {
      sendMessage({ text }, { metadata: { botId: selectedBot.id } })
      return
    }

    sendMessage({ text })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Send a message below to start the conversation."
            />
          ) : (
            messages.map((message) => {
              // In group chats, assistant messages have metadata.botId to identify which bot replied
              const botId =
                kind === "group" && message.role === "assistant"
                  ? (message.metadata as { botId?: string } | undefined)?.botId
                  : undefined
              const bot = botId
                ? members.find((member) => member.id === botId)
                : undefined

              const messageContent = (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse
                            key={`${message.id}-text-${index}`}
                          >
                            {part.text}
                          </MessageResponse>
                        )
                      }

                      if (isToolPart(part)) {
                        return (
                          <ChatTool
                            key={
                              part.toolCallId ??
                              `${message.id}-tool-${index}`
                            }
                            part={part}
                          />
                        )
                      }

                      return null
                    })}
                  </MessageContent>
                </Message>
              )

              // In group chats, show bot avatar next to assistant messages
              if (kind === "group" && message.role === "assistant" && bot) {
                return (
                  <div
                    key={message.id}
                    className="group flex w-full max-w-[95%] flex-col gap-2 is-assistant"
                  >
                    <div className="flex gap-2">
                      <ChatAvatar
                        seed={bot.avatar}
                        className="size-8 shrink-0 self-end"
                      />
                      <div className="flex-1 min-w-0">{messageContent}</div>
                    </div>
                  </div>
                )
              }

              return messageContent
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 p-4">
        {error && (
          <p className="mb-2 text-sm text-destructive">
            {error.message || "Something went wrong."}
          </p>
        )}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder={placeholder} />
          </PromptInputBody>
          <PromptInputFooter
            className={
              kind === "group" && selectedBot ? undefined : "justify-end"
            }
          >
            {kind === "group" && selectedBot && (
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  size="sm"
                  className="h-8 max-w-48 min-w-0 gap-1.5 px-1.5"
                  aria-label={`Choose which bot replies. Currently ${selectedBot.name}.`}
                >
                  <ChatAvatar
                    seed={selectedBot.avatar}
                    className="size-5 shrink-0"
                  />
                  <span className="min-w-0 truncate text-xs font-medium">
                    {selectedBot.name}
                  </span>
                  <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent
                  align="start"
                  className="min-w-44"
                >
                  {members.map((member) => (
                    <PromptInputActionMenuItem
                      key={member.id}
                      onClick={() => setSelectedBotId(member.id)}
                    >
                      <ChatAvatar
                        seed={member.avatar}
                        className="size-5 shrink-0"
                      />
                      <span className="min-w-0 truncate">{member.name}</span>
                      {member.id === selectedBot.id && (
                        <CheckIcon className="ml-auto size-4 shrink-0" />
                      )}
                    </PromptInputActionMenuItem>
                  ))}
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            )}
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-")
}

function ChatTool({ part }: { part: ToolPart }) {
  const toolName =
    part.type === "dynamic-tool"
      ? part.toolName
      : part.type.slice("tool-".length)
  const title = TOOL_TITLES[toolName] ?? toolName
  const returnedError =
    part.state === "output-available"
      ? stringField(part.output, "error")
      : undefined
  const displayState = returnedError ? ("output-error" as const) : part.state
  const defaultOpen =
    toolName === "showScreen" ||
    part.state === "output-error" ||
    Boolean(returnedError)

  return (
    <Tool defaultOpen={defaultOpen}>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          title={title}
          type={part.type}
          state={displayState}
          toolName={part.toolName}
        />
      ) : (
        <ToolHeader title={title} type={part.type} state={displayState} />
      )}
      <ToolContent>
        {!SCREEN_TOOLS.has(toolName) && <ToolInput input={part.input} />}
        <ChatToolOutput part={part} toolName={toolName} />
      </ToolContent>
    </Tool>
  )
}

function ChatToolOutput({
  part,
  toolName,
}: {
  part: ToolPart
  toolName: string
}) {
  if (part.state !== "output-available" && part.state !== "output-error") {
    return null
  }

  const executionError =
    part.state === "output-error"
      ? (part.errorText ?? "Tool execution failed.")
      : undefined
  const output = part.state === "output-available" ? part.output : undefined
  const returnedError = stringField(output, "error")

  if (executionError || returnedError) {
    return (
      <ToolOutput
        output={undefined}
        errorText={executionError ?? returnedError}
      />
    )
  }

  if (part.state !== "output-available") return null

  return (
    <ToolOutput
      output={renderToolResult(toolName, output)}
      errorText={undefined}
    />
  )
}

function renderToolResult(toolName: string, output: unknown) {
  const record = asRecord(output)

  switch (toolName) {
    case "bash": {
      const exitCode = numberField(record, "exitCode")
      const stdout = stringField(record, "output") ?? ""

      return (
        <div>
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3 text-xs text-muted-foreground">
            <span>Exit code: {exitCode ?? "unknown"}</span>
            {record?.truncated === true && <span>· output truncated</span>}
          </div>
          <Terminal output={stdout || "(no output)"} />
        </div>
      )
    }

    case "readFile": {
      const path = stringField(record, "path") ?? "file"
      const content = stringField(record, "content") ?? ""
      const startLine = numberField(record, "startLine")
      const endLine = numberField(record, "endLine")
      const totalLines = numberField(record, "totalLines")

      return (
        <div className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">
            {path}
            {startLine !== undefined && endLine !== undefined
              ? ` · lines ${startLine}-${endLine} of ${totalLines ?? "?"}`
              : ""}
            {record?.truncated === true ? " · truncated" : ""}
          </p>
          <pre className="max-h-96 overflow-auto rounded-md border bg-background p-4 font-mono text-sm">
            <code>{content || "(empty file)"}</code>
          </pre>
        </div>
      )
    }

    case "writeFile": {
      const path = stringField(record, "path") ?? "file"
      const bytes = numberField(record, "bytes") ?? 0

      return (
        <p className="p-3 text-sm">
          Wrote {bytes} {bytes === 1 ? "byte" : "bytes"} to{" "}
          <code className="rounded bg-muted px-1 py-0.5">{path}</code>.
        </p>
      )
    }

    case "listFiles": {
      const path = stringField(record, "path") ?? "."
      const entries = Array.isArray(record?.entries) ? record.entries : []
      const rows = entries.flatMap((entry, index) => {
        const item = asRecord(entry)
        if (!item) return []
        const itemPath = stringField(item, "path") ?? String(index)
        const name = stringField(item, "name") ?? itemPath
        return [
          item.isDir === true ? (
            <FileTreeFolder key={itemPath} path={itemPath} name={name} />
          ) : (
            <FileTreeFile key={itemPath} path={itemPath} name={name} />
          ),
        ]
      })

      return (
        <div className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">
            {path} · {entries.length}{" "}
            {entries.length === 1 ? "entry" : "entries"}
            {record?.truncated === true ? " · truncated" : ""}
          </p>
          {rows.length > 0 ? (
            <FileTree className="max-h-80 overflow-auto">{rows}</FileTree>
          ) : (
            <p className="text-sm">Empty directory.</p>
          )}
        </div>
      )
    }

    case "mouseClick": {
      const x = numberField(record, "x")
      const y = numberField(record, "y")
      const button = stringField(record, "button") ?? "left"
      const double = record?.double === true
      return (
        <p className="p-3 text-sm">
          Clicked {button} at ({x ?? "?"}, {y ?? "?"})
          {double ? " (double)" : ""}.
        </p>
      )
    }

    case "mouseMove": {
      const x = numberField(record, "x")
      const y = numberField(record, "y")
      return (
        <p className="p-3 text-sm">
          Moved the pointer to ({x ?? "?"}, {y ?? "?"}).
        </p>
      )
    }

    case "mouseScroll": {
      const x = numberField(record, "x")
      const y = numberField(record, "y")
      const direction = stringField(record, "direction") ?? "down"
      const amount = numberField(record, "amount") ?? 1
      return (
        <p className="p-3 text-sm">
          Scrolled {direction} {amount} {amount === 1 ? "tick" : "ticks"} at (
          {x ?? "?"}, {y ?? "?"}).
        </p>
      )
    }

    case "mouseDrag": {
      const startX = numberField(record, "startX")
      const startY = numberField(record, "startY")
      const endX = numberField(record, "endX")
      const endY = numberField(record, "endY")
      return (
        <p className="p-3 text-sm">
          Dragged from ({startX ?? "?"}, {startY ?? "?"}) to ({endX ?? "?"},{" "}
          {endY ?? "?"}).
        </p>
      )
    }

    case "keyboardType": {
      const characters = numberField(record, "characters") ?? 0
      return (
        <p className="p-3 text-sm">
          Typed {characters} {characters === 1 ? "character" : "characters"}.
        </p>
      )
    }

    case "keyboardPress": {
      const key = stringField(record, "key") ?? "key"
      const modifiers = Array.isArray(record?.modifiers)
        ? record.modifiers.filter(
            (modifier): modifier is string => typeof modifier === "string"
          )
        : []
      return (
        <p className="p-3 text-sm">
          Pressed {key}
          {modifiers.length > 0 ? ` with ${modifiers.join("+")}` : ""}.
        </p>
      )
    }

    case "keyboardHotkey": {
      const keys = stringField(record, "keys") ?? "hotkey"
      return <p className="p-3 text-sm">Pressed {keys}.</p>
    }

    case "viewScreen": {
      const width = numberField(record, "width")
      const height = numberField(record, "height")
      const dimensions = width && height ? ` (${width}×${height})` : ""

      return (
        <p className="p-3 text-sm text-muted-foreground">
          Screen captured{dimensions}. The screenshot is available to the agent
          but hidden in the chat.
        </p>
      )
    }

    case "showScreen": {
      const image = stringField(record, "image")
      const mediaType = stringField(record, "mediaType") ?? "image/jpeg"
      const width = numberField(record, "width")
      const height = numberField(record, "height")
      const dimensions = width && height ? ` · ${width}×${height}` : ""

      if (!image) {
        return <p className="p-3 text-sm">No screenshot was returned.</p>
      }

      return (
        <div className="space-y-2 p-3">
          <Image
            alt="Screenshot of the bot's sandbox desktop"
            base64={image}
            className="border"
            mediaType={mediaType}
            uint8Array={new Uint8Array()}
          />
          <p className="text-xs text-muted-foreground">
            Sandbox desktop{dimensions}
          </p>
        </div>
      )
    }

    default:
      return output
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function stringField(value: unknown, field: string) {
  const record = asRecord(value)
  const result = record?.[field]
  return typeof result === "string" ? result : undefined
}

function numberField(value: unknown, field: string) {
  const record = asRecord(value)
  const result = record?.[field]
  return typeof result === "number" ? result : undefined
}
