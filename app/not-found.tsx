import { FileQuestionIcon } from "lucide-react"

import { NotFoundState } from "@/components/not-found-state"

/**
 * Fallback for every unmatched route that has no closer not-found boundary.
 */
export default function NotFound() {
  return (
    <NotFoundState
      className="min-h-svh"
      icon={<FileQuestionIcon />}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved. Head back to the dashboard to pick up where you left off."
    />
  )
}
