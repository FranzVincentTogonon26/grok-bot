import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import type { ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Shared 404 state: a face-less empty view with a way back to the dashboard.
 * Used by route-level `not-found.tsx` files so a stale chat link never traps
 * the user on a bare Next.js error page.
 */
export function NotFoundState({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  className?: string
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {/* A Link styled as a button: Base UI's Button rejects non-<button>
            render targets, and forcing it would strip the anchor semantics. */}
        <Link href="/" className={buttonVariants()}>
          <ArrowLeftIcon data-icon="inline-start" />
          Go to dashboard
        </Link>
      </EmptyContent>
    </Empty>
  )
}
