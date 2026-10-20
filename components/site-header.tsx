import Link from "next/link"

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-[12px]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="text-sm font-medium tracking-tight">
          grok-bot
        </Link>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  )
}
