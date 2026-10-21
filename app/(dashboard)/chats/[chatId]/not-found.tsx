import { MessageSquareXIcon } from "lucide-react"

import { NotFoundState } from "@/components/not-found-state"

/**
 * A chat id that is missing (deleted, or another user's). Rendered inside the
 * dashboard layout, so the sidebar stays available as well as the button.
 */
export default function ChatNotFound() {
  return (
    <NotFoundState
      icon={<MessageSquareXIcon />}
      title="Chat not found"
      description="This chat was deleted or the link is out of date. Pick another chat from the sidebar, or head back to the dashboard."
    />
  )
}
