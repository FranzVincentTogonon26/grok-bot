import { ChatAvatar } from "@/components/chat-avatar"
import { cn } from "cn"

type GroupChatAvatarProps = {
  /** Avatar seeds for every member, in display order. */
  seeds: string[]
  /** Turn on each face's built-in animation. */
  animated?: boolean
  /** Resize override; the whole group stack occupies one square. */
  className?: string
}

const RING = "ring-1 ring-background"

/**
 * A single square that stacks a group's member avatars at the same size as one
 * ChatAvatar. Two members overlap side by side; three form a triangle; four or
 * more show three faces plus a count for the rest in a 2x2 grid.
 */
export function GroupChatAvatar({
  seeds,
  animated = false,
  className,
}: GroupChatAvatarProps) {
  const visible = seeds.slice(0, 3)
  const remaining = seeds.length - visible.length

  if (visible.length === 0) {
    return (
      <span
        className={cn(
          "block size-8 shrink-0 rounded-full bg-muted",
          className,
        )}
      />
    )
  }

  if (visible.length === 1) {
    return (
      <ChatAvatar
        seed={visible[0]}
        animated={animated}
        className={cn("size-8 shrink-0", className)}
      />
    )
  }

  if (visible.length === 2) {
    return (
      <span className={cn("relative block size-8 shrink-0", className)}>
        <span
          className={cn(
            "absolute top-[20%] left-0 size-[60%] overflow-hidden rounded-full bg-muted",
            RING,
          )}
        >
          <ChatAvatar
            seed={visible[0]}
            animated={animated}
            className="size-full"
          />
        </span>
        <span
          className={cn(
            "absolute top-[20%] right-0 size-[60%] overflow-hidden rounded-full bg-muted",
            RING,
          )}
        >
          <ChatAvatar
            seed={visible[1]}
            animated={animated}
            className="size-full"
          />
        </span>
      </span>
    )
  }

  if (remaining === 0) {
    return (
      <span className={cn("relative block size-8 shrink-0", className)}>
        {visible.map((seed, index) => (
          <span
            key={`${seed}-${index}`}
            className={cn(
              "absolute size-[56%] overflow-hidden rounded-full bg-muted",
              index === 0 && "top-0 left-[22%]",
              index === 1 && "bottom-0 left-0",
              index === 2 && "right-0 bottom-0",
              RING,
            )}
          >
            <ChatAvatar
              seed={seed}
              animated={animated}
              className="size-full"
            />
          </span>
        ))}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "@container relative grid size-8 shrink-0 grid-cols-2 grid-rows-2 gap-px",
        className,
      )}
    >
      {visible.map((seed, index) => (
        <span
          key={`${seed}-${index}`}
          className="overflow-hidden rounded-full bg-muted"
        >
          <ChatAvatar
            seed={seed}
            animated={animated}
            className="size-full"
          />
        </span>
      ))}
      <span className="flex items-center justify-center rounded-full bg-muted text-[26cqw] leading-none font-semibold tracking-tight text-muted-foreground">
        +{remaining}
      </span>
    </span>
  )
}
