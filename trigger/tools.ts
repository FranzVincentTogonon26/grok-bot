import type { Sandbox } from "@daytona/sdk"
import { tool } from "ai"
import { z } from "zod"

import { getDaytonaClient } from "@/lib/daytona-client"

const SANDBOX_START_TIMEOUT_SECONDS = 120
const MAX_COMMAND_OUTPUT = 20_000
const MAX_READ_BYTES = 400_000
const MAX_RANGED_READ_BYTES = 4_000_000
const MAX_LIST_ENTRIES = 200

type ToolError = { error: string }

type ScreenshotResult = {
  image: string
  mediaType: "image/jpeg"
  width: number
  height: number
  sizeBytes?: number
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function errorResult(error: unknown): ToolError {
  return { error: errorMessage(error) }
}

/**
 * Resolve a bot's sandbox and make sure it is running. Daytona can stop idle
 * sandboxes; the first tool call after a pause pays the start time once.
 */
async function connectSandbox(sandboxId: string): Promise<Sandbox> {
  const daytona = await getDaytonaClient()
  const sandbox = await daytona.get(sandboxId)

  if (sandbox.state !== "started") {
    await sandbox.start(SANDBOX_START_TIMEOUT_SECONDS)
  }

  return sandbox
}

/**
 * The desktop processes (Xvfb, XFCE, VNC) can be stopped independently of the
 * sandbox. Starting them is idempotent; skip the call when they are already up.
 */
async function ensureDesktop(sandbox: Sandbox) {
  const status = await sandbox.computerUse.getStatus()
  if (status.status !== "active") {
    await sandbox.computerUse.start()
  }
}

/**
 * A screenshot has to travel two ways:
 *
 * - `toModelOutput` turns it into an image content part so the model can see
 *   the desktop.
 * - The raw output stays on the tool part so `showScreen` can render the image
 *   in the chat. `viewScreen` deliberately hides it in the UI.
 */
function screenshotToModelOutput({
  output,
}: {
  output: ScreenshotResult | ToolError
}) {
  if ("error" in output) {
    return {
      type: "text" as const,
      value: `Screenshot failed: ${output.error}`,
    }
  }

  const dimensions =
    output.width && output.height ? ` (${output.width}x${output.height})` : ""

  return {
    type: "content" as const,
    value: [
      {
        type: "text" as const,
        text: `Screenshot captured${dimensions}.`,
      },
      {
        type: "image-data" as const,
        data: output.image,
        mediaType: output.mediaType,
      },
    ],
  }
}

/**
 * The computer-use toolset for one bot. All tools are bound to that bot's
 * sandbox id; the model can never choose a different sandbox.
 *
 * Desktop operations are serialized because the AI SDK may execute parallel
 * tool calls. A click and a screenshot in the same step must not race.
 */
export function createAgentTools(sandboxId: string) {
  let sandboxPromise: Promise<Sandbox> | undefined
  let desktopPromise: Promise<Sandbox> | undefined
  let desktopQueue: Promise<unknown> = Promise.resolve()

  const getSandbox = () => (sandboxPromise ??= connectSandbox(sandboxId))

  const getDesktop = () =>
    (desktopPromise ??= getSandbox().then(async (sandbox) => {
      await ensureDesktop(sandbox)
      return sandbox
    }))

  const runOnDesktop = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = desktopQueue.then(fn, fn)
    desktopQueue = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  const captureScreen = async (): Promise<ScreenshotResult | ToolError> => {
    try {
      const sandbox = await getDesktop()
      const [screenshot, display] = await Promise.all([
        sandbox.computerUse.screenshot.takeCompressed({
          format: "jpeg",
          quality: 80,
          scale: 1,
          showCursor: true,
        }),
        sandbox.computerUse.display.getInfo().catch(() => null),
      ])

      if (!screenshot.screenshot) {
        return { error: "Daytona returned an empty screenshot." }
      }

      const primary =
        display?.displays?.find((entry) => entry.isActive) ??
        display?.displays?.[0]

      return {
        image: screenshot.screenshot,
        mediaType: "image/jpeg",
        width: primary?.width ?? 0,
        height: primary?.height ?? 0,
        sizeBytes: screenshot.sizeBytes,
      }
    } catch (error) {
      return errorResult(error)
    }
  }

  return {
    bash: tool({
      description:
        "Run a shell command in the bot's Linux sandbox. Use this for programs, package installs, tests, and anything not covered by the file tools. Long-running servers should redirect output and run in the background.",
      inputSchema: z.object({
        command: z.string().min(1).describe("The shell command to run."),
        cwd: z
          .string()
          .optional()
          .describe(
            "Working directory. Defaults to the sandbox working directory."
          ),
        timeoutSeconds: z
          .number()
          .int()
          .min(1)
          .max(300)
          .optional()
          .describe("Maximum run time in seconds. Defaults to 60."),
      }),
      execute: async ({ command, cwd, timeoutSeconds }) => {
        try {
          const sandbox = await getSandbox()
          const response = await sandbox.process.executeCommand(
            command,
            cwd,
            undefined,
            timeoutSeconds ?? 60
          )
          const truncated = response.result.length > MAX_COMMAND_OUTPUT

          return {
            exitCode: response.exitCode,
            output: truncated
              ? `${response.result.slice(0, MAX_COMMAND_OUTPUT)}\n… [truncated]`
              : response.result,
            truncated,
          }
        } catch (error) {
          return errorResult(error)
        }
      },
      toModelOutput: ({ output }) => {
        if ("error" in output) {
          return { type: "text" as const, value: `Error: ${output.error}` }
        }
        return {
          type: "text" as const,
          value: `Exit code: ${output.exitCode}\n${output.output || "(no output)"}`,
        }
      },
    }),

    readFile: tool({
      description:
        "Read a UTF-8 text file from the bot's sandbox. Use startLine and endLine to read a smaller window of a large file.",
      inputSchema: z.object({
        path: z.string().min(1).describe("Remote path to read."),
        startLine: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("First line to include, 1-based."),
        endLine: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Last line to include, inclusive."),
      }),
      execute: async ({ path, startLine, endLine }) => {
        try {
          const sandbox = await getSandbox()
          const buffer = await sandbox.fs.downloadFile(path)
          const ranged = startLine !== undefined || endLine !== undefined

          if (buffer.length > MAX_READ_BYTES && !ranged) {
            return {
              error: `File is ${buffer.length} bytes; read it in ranges with startLine/endLine or use bash.`,
            }
          }
          if (buffer.length > MAX_RANGED_READ_BYTES) {
            return {
              error: `File is too large to read in one request (${buffer.length} bytes); use bash to inspect it.`,
            }
          }
          if (buffer.includes(0)) {
            return {
              error: `${path} looks like a binary file; use bash to inspect it.`,
            }
          }

          const lines = buffer.toString("utf8").split("\n")
          const totalLines = lines.length
          const start = startLine ?? 1
          const end = Math.min(endLine ?? totalLines, totalLines)

          if (start > totalLines) {
            return {
              error: `startLine ${start} is past the end of ${path} (${totalLines} lines).`,
            }
          }
          if (start > end) {
            return { error: "startLine must be less than or equal to endLine." }
          }

          return {
            path,
            content: lines.slice(start - 1, end).join("\n"),
            startLine: start,
            endLine: end,
            totalLines,
            truncated: end < totalLines,
          }
        } catch (error) {
          return errorResult(error)
        }
      },
      toModelOutput: ({ output }) => {
        if ("error" in output) {
          return { type: "text" as const, value: `Error: ${output.error}` }
        }

        return {
          type: "text" as const,
          value: `${output.path} (lines ${output.startLine}-${output.endLine} of ${output.totalLines}${output.truncated ? ", truncated" : ""})\n${output.content}`,
        }
      },
    }),

    writeFile: tool({
      description:
        "Write UTF-8 text to a file in the bot's sandbox. Parent directories are created when possible.",
      inputSchema: z.object({
        path: z.string().min(1).describe("Remote path to write."),
        content: z.string().describe("Full UTF-8 file contents."),
      }),
      execute: async ({ path, content }) => {
        try {
          const sandbox = await getSandbox()
          const slash = path.lastIndexOf("/")

          if (slash > 0) {
            await sandbox.fs
              .createFolder(path.slice(0, slash), "755")
              .catch(() => undefined)
          }

          const buffer = Buffer.from(content, "utf8")
          await sandbox.fs.uploadFile(buffer, path)

          return { path, bytes: buffer.length }
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    listFiles: tool({
      description:
        "List files and directories in the bot's sandbox. Use depth 2 or 3 for a small tree.",
      inputSchema: z.object({
        path: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Directory path. Defaults to the sandbox working directory."
          ),
        depth: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .describe("How many levels deep to list. Defaults to 1."),
      }),
      execute: async ({ path, depth }) => {
        try {
          const sandbox = await getSandbox()
          const entries = await sandbox.fs.listFiles(path ?? ".", { depth })
          const sorted = [...entries].sort(
            (a, b) =>
              Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)
          )

          return {
            path: path ?? ".",
            entries: sorted.slice(0, MAX_LIST_ENTRIES).map((entry) => ({
              name: entry.name,
              path: entry.path ?? entry.name,
              isDir: entry.isDir,
              size: entry.size,
              modifiedAt: entry.modifiedAt,
            })),
            truncated: sorted.length > MAX_LIST_ENTRIES,
          }
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    mouseClick: tool({
      description:
        "Click the mouse at pixel coordinates on the sandbox desktop. Use viewScreen first to find the target. Coordinates start at the top-left.",
      inputSchema: z.object({
        x: z.number().int().min(0).describe("Horizontal pixel coordinate."),
        y: z.number().int().min(0).describe("Vertical pixel coordinate."),
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .describe("Mouse button. Defaults to left."),
        double: z.boolean().optional().describe("Double-click when true."),
      }),
      execute: async ({ x, y, button, double }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            await sandbox.computerUse.mouse.click(x, y, button, double)
            return {
              ok: true,
              x,
              y,
              button: button ?? "left",
              double: double ?? false,
            }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    mouseMove: tool({
      description:
        "Move the mouse cursor to pixel coordinates on the sandbox desktop.",
      inputSchema: z.object({
        x: z.number().int().min(0).describe("Horizontal pixel coordinate."),
        y: z.number().int().min(0).describe("Vertical pixel coordinate."),
      }),
      execute: async ({ x, y }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            const position = await sandbox.computerUse.mouse.move(x, y)
            return { ok: true, x: position.x, y: position.y }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    mouseScroll: tool({
      description:
        "Scroll the mouse wheel at pixel coordinates on the sandbox desktop.",
      inputSchema: z.object({
        x: z.number().int().min(0).describe("Horizontal pixel coordinate."),
        y: z.number().int().min(0).describe("Vertical pixel coordinate."),
        direction: z.enum(["up", "down"]).describe("Scroll direction."),
        amount: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Number of wheel ticks. Defaults to 1."),
      }),
      execute: async ({ x, y, direction, amount }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            const scrolled = await sandbox.computerUse.mouse.scroll(
              x,
              y,
              direction,
              amount ?? 1
            )
            return { ok: scrolled, x, y, direction, amount: amount ?? 1 }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    mouseDrag: tool({
      description:
        "Drag the mouse from one pixel coordinate to another. Useful for selections, sliders, and moving windows.",
      inputSchema: z.object({
        startX: z
          .number()
          .int()
          .min(0)
          .describe("Start horizontal coordinate."),
        startY: z.number().int().min(0).describe("Start vertical coordinate."),
        endX: z.number().int().min(0).describe("End horizontal coordinate."),
        endY: z.number().int().min(0).describe("End vertical coordinate."),
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .describe("Mouse button. Defaults to left."),
      }),
      execute: async ({ startX, startY, endX, endY, button }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            await sandbox.computerUse.mouse.drag(
              startX,
              startY,
              endX,
              endY,
              button
            )
            return {
              ok: true,
              startX,
              startY,
              endX,
              endY,
              button: button ?? "left",
            }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    keyboardType: tool({
      description:
        "Type text into the focused window on the sandbox desktop. Newlines become Enter presses; tabs and other control characters are unsupported.",
      inputSchema: z.object({
        text: z.string().min(1).describe("Text to type."),
        delayMs: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .optional()
          .describe("Delay between characters in milliseconds."),
      }),
      execute: async ({ text, delayMs }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            await sandbox.computerUse.keyboard.type(text, delayMs)
            return { ok: true, characters: text.length }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    keyboardPress: tool({
      description:
        "Press one key on the sandbox desktop, optionally with modifiers. Examples: enter, escape, tab, up, f5, c with ctrl.",
      inputSchema: z.object({
        key: z.string().min(1).describe("Key name, for example enter or f5."),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .optional()
          .describe("Modifier keys to hold while pressing."),
      }),
      execute: async ({ key, modifiers }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            await sandbox.computerUse.keyboard.press(key, modifiers)
            return { ok: true, key, modifiers: modifiers ?? [] }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    keyboardHotkey: tool({
      description:
        "Press a hotkey chord on the sandbox desktop, for example ctrl+c or alt+tab.",
      inputSchema: z.object({
        keys: z.string().min(1).describe("Hotkey chord, for example ctrl+c."),
      }),
      execute: async ({ keys }) => {
        try {
          return await runOnDesktop(async () => {
            const sandbox = await getDesktop()
            await sandbox.computerUse.keyboard.hotkey(keys)
            return { ok: true, keys }
          })
        } catch (error) {
          return errorResult(error)
        }
      },
    }),

    viewScreen: tool({
      description:
        "Capture the sandbox desktop and inspect it yourself. Use this before mouse or keyboard actions when you need to see the layout. The screenshot is not shown in the chat.",
      inputSchema: z.object({}),
      execute: () => runOnDesktop(captureScreen),
      toModelOutput: screenshotToModelOutput,
    }),

    showScreen: tool({
      description:
        "Capture the sandbox desktop and show the screenshot in the chat. Use this when the user asks to see the screen; you can inspect it too.",
      inputSchema: z.object({}),
      execute: () => runOnDesktop(captureScreen),
      toModelOutput: screenshotToModelOutput,
    }),
  }
}

export type AgentTools = ReturnType<typeof createAgentTools>
