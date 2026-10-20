"use client"

import { useEffect, useState } from "react"
import { UserButton } from "@clerk/nextjs"
import { differenceInSeconds, formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersRound, SearchIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { SidebarChat } from "@/queries/bots"

/**
 * Trigger/box/avatar styling lives in app/globals.css (cl-userButton*
 * selectors, scoped to [data-clerk-component="UserButton"]); the UI is
 * pinned via <ClerkProvider ui={ui}> to keep those classes stable.
 *
 * rootBox here is the one element whose classes reliably land on the
 * mount host — a grid there stretches the trigger to the full menu-item
 * width (its roundWrapper variant sets width: unset, i.e. fit-content).
 */
const userButtonAppearance = {
  elements: {
    rootBox: "h-8 w-full! min-w-0! grid! items-center! justify-items-stretch!",
  },
}

/**
 * "2 days", "now" — strict units, no "ago" suffix.
 */
function formatChatTime(date: Date) {
  if (differenceInSeconds(new Date(), date) < 60) return "now"
  return formatDistanceToNowStrict(date)
}

function ChatMenuItem({ chat }: { chat: SidebarChat }) {
  return (
    <SidebarMenuItem>
      {/* Collapsed: the lg variant drops to a size-8 padded-0 icon square, so
          the avatar shrinks 10→8 to fill it; the text column (min-w-0 flex)
          goes to zero width. Tooltip surfaces the chat name in that state. */}
      <SidebarMenuButton
        size="lg"
        tooltip={chat.displayName}
        render={<Link href={`/chats/${chat.id}`} />}
      >
        <ChatAvatar
          seed={chat.botAvatar}
          className="size-10 shrink-0 group-data-[collapsible=icon]:size-8!"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{chat.displayName}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatChatTime(chat.lastMessageAt)}
            </span>
          </div>
          {chat.lastMessagePreview && (
            <span className="truncate text-xs text-muted-foreground">
              {chat.lastMessagePreview}
            </span>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * Chats searchable the same way they appear in the sidebar — group chats are
 * ignored for now, the first (earliest-joined) member bot is the chat's face,
 * which getSidebarChats already resolves server-side.
 */
export function ChatsCommandDialog({
  chats,
  open,
  onOpenChange,
}: {
  chats: SidebarChat[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search chats"
      description="Filter your chats by name or last message."
    >
      <Command>
        <CommandInput placeholder="Search chats..." />
        <CommandList>
          <CommandEmpty>No chats found.</CommandEmpty>
          <CommandGroup heading="Chats">
            {chats.map((chat) => (
              <CommandItem
                key={chat.id}
                value={`${chat.displayName} ${chat.lastMessagePreview ?? ""}`}
                onSelect={() => {
                  onOpenChange(false)
                  router.push(`/chats/${chat.id}`)
                }}
              >
                <ChatAvatar seed={chat.botAvatar} className="size-6 shrink-0" />
                <span className="truncate">{chat.displayName}</span>
                <CommandShortcut className="tracking-normal">
                  {formatChatTime(chat.lastMessageAt)}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export function AppSidebar({ chats }: { chats: SidebarChat[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [chatsSearchOpen, setChatsSearchOpen] = useState(false)

  // ⌘K / Ctrl+K toggles the chats search palette. The visual indicator in
  // the search button renders with the built-in <Kbd> component.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setChatsSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <ChatsCommandDialog
        chats={chats}
        open={chatsSearchOpen}
        onOpenChange={setChatsSearchOpen}
      />
      <Sidebar collapsible="icon">
        <SidebarHeader className="items-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-xl group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:rounded-md!"
                  aria-label="Create chat"
                />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                <PlusIcon />
                Create new bot
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UsersRound />
                Create group chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Fake input — Input's default classes copied so it reads as one;
              the Button's own hover (hover:bg-primary/80) is kept intact.
              Collapsed: an icon square that matches the other menu buttons. */}
          <Button
            type="button"
            onClick={() => setChatsSearchOpen(true)}
            className="h-8 w-full min-w-0 justify-start rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal dark:bg-input/30 md:text-sm group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:rounded-md! group-data-[collapsible=icon]:border-transparent! group-data-[collapsible=icon]:bg-transparent! group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:hover:bg-sidebar-accent!"
          >
            <SearchIcon className="text-muted-foreground" />
            <span className="text-muted-foreground group-data-[collapsible=icon]:hidden">
              Search chats...
            </span>
            <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘K</Kbd>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          {chats.length > 0 && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {chats.map((chat) => (
                    <ChatMenuItem key={chat.id} chat={chat} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton showName appearance={userButtonAppearance} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
