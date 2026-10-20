import { Avatar, Style } from "@dicebear/core"
import gazeDefinition from "@dicebear/styles/gaze.json" with { type: "json" }
import Image from "next/image"
import { cn } from "cn"

/** Reused across avatars — the style instance holds no per-avatar state. */
const gaze = new Style(gazeDefinition)

type ChatAvatarProps = {
  /** Seed controlling the avatar's body, eyes, and colors. */
  seed: string
  /** Turn on gaze's built-in wander/blink/hop animation. */
  animated?: boolean
  /** Resize override; defaults to 32px. */
  className?: string
}

export function ChatAvatar({
  seed,
  animated = false,
  className,
}: ChatAvatarProps) {
  const avatar = new Avatar(
    gaze,
    animated ? { seed, animationProbability: 100 } : { seed },
  )

  return (
    <Image
      src={avatar.toDataUri()}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={cn("size-8", className)}
    />
  )
}
