"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePanelRef } from "react-resizable-panels"

import { SandboxPreview } from "@/components/sandbox-desktop"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"

type ChatDesktopContextValue = {
  open: boolean
  toggle: () => void
}

const ChatDesktopContext = createContext<ChatDesktopContextValue | null>(null)

export function ChatDesktopProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const value = useMemo(
    () => ({
      open,
      toggle: () => setOpen((current) => !current),
    }),
    [open]
  )

  return (
    <ChatDesktopContext.Provider value={value}>
      {children}
    </ChatDesktopContext.Provider>
  )
}

export function useChatDesktop() {
  const context = useContext(ChatDesktopContext)

  if (!context) {
    throw new Error("useChatDesktop must be used within ChatDesktopProvider")
  }

  return context
}

/**
 * The desktop surface lives in a collapsible resizable panel. The panel is
 * always mounted so its VNC iframe can survive closing the panel; its size is
 * driven imperatively from the header toggle.
 */
export function ChatDesktopPanel() {
  const { open } = useChatDesktop()
  const panelRef = usePanelRef()
  const lastSize = useRef("30%")

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    if (open) {
      panel.resize(lastSize.current)
    } else {
      const { asPercentage } = panel.getSize()
      if (asPercentage > 0) lastSize.current = `${asPercentage}%`
      panel.collapse()
    }
  }, [open, panelRef])

  return (
    <>
      {open && <ResizableHandle withHandle />}
      <ResizablePanel
        id="desktop-panel"
        panelRef={panelRef}
        defaultSize="0%"
        minSize="20%"
        maxSize="50%"
        collapsible
        collapsedSize="0%"
        className="min-w-0 overflow-hidden"
      >
        <SandboxPreview active={open} />
      </ResizablePanel>
    </>
  )
}
