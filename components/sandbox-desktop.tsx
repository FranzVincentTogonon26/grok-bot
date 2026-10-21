"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ExpandIcon,
  MonitorIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"

import { getChatDesktopPreview } from "@/actions/chat"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

type SandboxDesktopStatus = "idle" | "loading" | "ready" | "error"

type SandboxDesktopContextValue = {
  botName: string
  status: SandboxDesktopStatus
  error: string | null
  frameLoaded: boolean
  ensureLoaded: () => void
  retry: () => void
  openFullscreen: () => void
  setPanelHost: (node: HTMLDivElement | null) => void
}

const SandboxDesktopContext =
  createContext<SandboxDesktopContextValue | null>(null)

function useSandboxDesktop() {
  const context = useContext(SandboxDesktopContext)

  if (!context) {
    throw new Error(
      "useSandboxDesktop must be used within SandboxDesktopProvider"
    )
  }

  return context
}

/**
 * noVNC's lite page renders a status bar above the desktop. The frame is
 * taller than its host and shifted up by the bar's height so only the
 * desktop is visible, in both the panel and the fullscreen dialog.
 */
function createDesktopFrame(url: string, onLoaded: () => void) {
  const iframe = document.createElement("iframe")
  iframe.src = url
  iframe.title = "Sandbox desktop"
  iframe.className = "size-full border-0 bg-[#696969]"
  iframe.tabIndex = 0
  iframe.allow = "clipboard-read; clipboard-write"
  iframe.style.transform = "translateY(-39px)"
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
  )
  iframe.addEventListener("load", onLoaded)
  return iframe
}

/**
 * Owns the VNC viewers for a chat.
 *
 * Moving an iframe between DOM parents destroys and reloads its browsing
 * context, so a single frame can never be shared by the panel and the
 * fullscreen dialog. Instead each surface gets its own persistent frame that
 * never moves: the panel viewer lives in the always-mounted panel card, the
 * dialog viewer lives in the dialog popup. Both connect to the same VNC
 * server, so the desktop itself — windows, terminal state, scroll position —
 * is never reset when opening or closing fullscreen.
 */
export function SandboxDesktopProvider({
  chatId,
  botName,
  children,
}: {
  chatId: string
  botName: string
  children: ReactNode
}) {
  const [status, setStatus] = useState<SandboxDesktopStatus>("idle")
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [panelFrameLoaded, setPanelFrameLoaded] = useState(false)
  const [dialogFrameLoaded, setDialogFrameLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null)
  const [dialogHost, setDialogHost] = useState<HTMLDivElement | null>(null)
  const panelFrameRef = useRef<HTMLIFrameElement | null>(null)
  const dialogFrameRef = useRef<HTMLIFrameElement | null>(null)
  const mountedRef = useRef(false)
  const loadingRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadDesktop = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setStatus("loading")
    setError(null)
    setPanelFrameLoaded(false)
    setDialogFrameLoaded(false)

    try {
      const result = await getChatDesktopPreview({ chatId })
      if (!mountedRef.current) return

      if (!result.ok) {
        setError(result.error)
        setStatus("error")
        return
      }

      setUrl(result.url)
      setStatus("ready")
    } catch (error) {
      if (!mountedRef.current) return
      console.error("Could not load sandbox desktop", error)
      setError("Couldn't load the desktop. Try again.")
      setStatus("error")
    } finally {
      loadingRef.current = false
    }
  }, [chatId])

  const ensureLoaded = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    void loadDesktop()
  }, [loadDesktop])

  const retry = useCallback(() => {
    panelFrameRef.current?.remove()
    dialogFrameRef.current?.remove()
    panelFrameRef.current = null
    dialogFrameRef.current = null
    setUrl(null)
    setError(null)
    setStatus("idle")
    startedRef.current = true
    void loadDesktop()
  }, [loadDesktop])

  const setPanelHostNode = useCallback((node: HTMLDivElement | null) => {
    setPanelHost(node)
  }, [])

  /**
   * The panel viewer is created once per signed URL and lives in the panel
   * card for its whole lifetime. It is not rendered by React, so React never
   * unmounts, recreates, or reparents it — the VNC websocket stays up while
   * the panel is collapsed.
   */
  const panelFrame = useMemo(() => {
    if (!url || typeof document === "undefined") return null
    return createDesktopFrame(url, () => setPanelFrameLoaded(true))
  }, [url])

  useEffect(() => {
    panelFrameRef.current = panelFrame
    if (!panelFrame) return

    const host = panelHost
    if (host && panelFrame.parentElement !== host) host.appendChild(panelFrame)

    return () => {
      if (panelFrameRef.current === panelFrame) panelFrameRef.current = null
    }
  }, [panelFrame, panelHost])

  /**
   * The fullscreen viewer is created when the dialog mounts and is removed
   * with it. It is a second live connection to the same desktop, which keeps
   * the panel session untouched across fullscreen open/close cycles.
   */
  useEffect(() => {
    if (!fullscreen || !url || !dialogHost) return

    const iframe = createDesktopFrame(url, () => setDialogFrameLoaded(true))
    dialogFrameRef.current = iframe
    dialogHost.appendChild(iframe)

    // Base UI moves focus to its own contents on open; focus the frame after
    // that settles so keyboard input lands inside the VNC session.
    const focusTimer = setTimeout(() => iframe.focus(), 50)

    return () => {
      clearTimeout(focusTimer)
      iframe.remove()
      if (dialogFrameRef.current === iframe) dialogFrameRef.current = null
      setDialogFrameLoaded(false)
    }
  }, [fullscreen, url, dialogHost])

  const openFullscreen = useCallback(() => {
    if (status === "ready") setFullscreen(true)
  }, [status])

  const value = useMemo<SandboxDesktopContextValue>(
    () => ({
      botName,
      status,
      error,
      frameLoaded: panelFrameLoaded,
      ensureLoaded,
      retry,
      openFullscreen,
      setPanelHost: setPanelHostNode,
    }),
    [
      botName,
      status,
      error,
      panelFrameLoaded,
      ensureLoaded,
      retry,
      openFullscreen,
      setPanelHostNode,
    ]
  )

  return (
    <SandboxDesktopContext.Provider value={value}>
      {children}

      <Dialog
        open={fullscreen}
        onOpenChange={(next, details) => {
          if (next) {
            setFullscreen(true)
            return
          }

          // Escape, backdrop presses, and focus changes must not close a
          // desktop that is receiving keyboard input. Only the explicit
          // close button is allowed to leave fullscreen.
          if (details.reason === "close-press") setFullscreen(false)
        }}
        disablePointerDismissal
      >
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[#696969] p-0 ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">
            {botName}&apos;s desktop
          </DialogTitle>
          <DialogDescription className="sr-only">
            Live view of the bot&apos;s sandbox desktop. Use the close button
            to return to the chat.
          </DialogDescription>

          <div className="absolute inset-0 overflow-hidden">
            <div
              ref={setDialogHost}
              className="absolute top-0 left-0 h-[calc(100%+39px)] w-full [&>iframe]:pointer-events-auto"
            />
          </div>

          {!dialogFrameLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#696969] text-white">
              <span className="sr-only">Connecting to the desktop</span>
              <Spinner className="size-5" />
            </div>
          )}

          <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
            <MonitorIcon className="size-3.5" />
            {botName}&apos;s desktop
          </div>

          <DialogClose
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-3 right-3 z-20 bg-background/80 backdrop-blur hover:bg-background"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close desktop</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </SandboxDesktopContext.Provider>
  )
}

/**
 * The panel and the fullscreen dialog both show the live desktop. Clicking
 * the panel preview expands it; the panel's iframe never accepts mouse or
 * keyboard input, only the fullscreen surface does. The card is always
 * top-aligned inside its resizable panel.
 */
export function SandboxPreview({ active }: { active: boolean }) {
  const {
    botName,
    status,
    error,
    frameLoaded,
    ensureLoaded,
    retry,
    openFullscreen,
    setPanelHost,
  } = useSandboxDesktop()

  useEffect(() => {
    if (active) ensureLoaded()
  }, [active, ensureLoaded])

  const loading = status === "idle" || status === "loading"
  const ready = status === "ready"
  const canOpen = ready && frameLoaded

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="group relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border bg-[#696969] shadow-sm">
        {/* noVNC's lite page has a 39px status bar. The iframe is taller than
            the card and translated up so the preview shows only the desktop. */}
        <div
          ref={setPanelHost}
          className="pointer-events-none absolute top-0 left-0 h-[calc(100%+39px)] w-full [&>iframe]:pointer-events-none"
        />

        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#696969] text-white">
            <Spinner className="size-5" />
            <p className="text-xs text-white/80">Starting desktop…</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 overflow-hidden bg-background/95 p-3 text-center">
            <MonitorIcon className="size-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-xs font-medium">Desktop unavailable</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {error}
              </p>
            </div>
            <Button type="button" variant="outline" size="xs" onClick={retry}>
              <RefreshCwIcon />
              Try again
            </Button>
          </div>
        )}

        {ready && !frameLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#696969] text-white">
            <Spinner className="size-5" />
            <p className="text-xs text-white/80">Connecting…</p>
          </div>
        )}

        {canOpen && (
          <button
            type="button"
            onClick={openFullscreen}
            aria-label={`Open ${botName}'s desktop fullscreen`}
            className="absolute inset-0 z-10 cursor-zoom-in rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <ExpandIcon className="size-3.5" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <MonitorIcon className="size-3.5 shrink-0" />
        <p className="truncate">{botName}&apos;s screen</p>
      </div>
    </div>
  )
}
