import { Plugin } from "@opencode/plugin"

/**
 * Auto-registers a slash command for every installed skill:
 *
 *   /skill-<id>     → loads that skill and runs your task
 *   /skills         → lists every installed skill and lets you pick
 *
 * The plugin polls the live skill registry, so when a new skill is
 * installed it gets its own command automatically — no config needed.
 */

type SkillEntry = {
  id: string
  name?: string
  description?: string
}

function toArray(out: unknown): SkillEntry[] {
  if (Array.isArray(out)) return out as SkillEntry[]
  const record = out as { data?: unknown; skills?: unknown } | null
  if (Array.isArray(record?.data)) return record.data as SkillEntry[]
  if (Array.isArray(record?.skills)) return record.skills as SkillEntry[]
  return []
}

export default Plugin.define({
  id: "skill-commands",
  async setup(ctx) {
    const POLL_MS = 15_000

    let registration: { dispose(): Promise<void> } | undefined
    let signature = ""

    const submit = async (
      sessionID: string,
      text: string,
      prompt: unknown,
      delivery: "steer" | "queue",
    ) => {
      await ctx.session.prompt({
        ...(prompt as Record<string, unknown>),
        sessionID,
        text,
        delivery,
      })
    }

    const build = async () => {
      const skills = await toArray(ctx.skill.list())
      if (skills.length === 0) return

      const sig = skills
        .map((s) => `${s.id}\t${s.description ?? s.name ?? ""}`)
        .sort()
        .join("\n")
      if (sig === signature) return
      signature = sig

      // Dispose the previous registration, then register the fresh set.
      const previous = registration
      const next = await ctx.command.transform((editor: {
        add: (definition: {
          name: string
          description?: string
          execute: (input: {
            sessionID: string
            prompt: { text?: string; files?: unknown[]; agents?: unknown[]; skills?: unknown[] }
            delivery: "steer" | "queue"
          }) => Promise<void>
        }) => {
          // /skills — picker for every installed skill
          editor.add({
            name: "skills",
            description: "List every installed skill and pick one to load",
            execute: async ({ sessionID, prompt, delivery }) => {
              const current = await toArray(ctx.skill.list())
              const lines = current.map(
                (s) =>
                  `- \`/skill-${s.id}\` — ${s.name ?? s.id}${s.description ? `: ${s.description}` : ""}`,
              )
              const task = (prompt.text ?? "").trim()
              const text = [
                `These skills are currently installed (${current.length}):`,
                ...lines,
                "",
                task
                  ? `Load the best matching skill with the skill tool, then follow its instructions for this task:\n\n${task}`
                  : "Ask me which skill I want to load. Once I reply, load it with the skill tool and follow its instructions.",
              ].join("\n")
              await submit(sessionID, text, prompt, delivery)
            },
          })

          // /skill-<id> — one launcher per installed skill
          for (const skill of skills) {
            const id = skill.id
            editor.add({
              name: `skill-${id}`,
              description: skill.description
                ? `Use the ${skill.name ?? id} skill — ${skill.description}`
                : `Use the ${skill.name ?? id} skill`,
              execute: async ({ sessionID, prompt, delivery }) => {
                const task = (prompt.text ?? "").trim()
                const text = task
                  ? `Use the skill tool to load the skill with ID exactly "${id}", then follow its full instructions for this task:\n\n${task}`
                  : `Use the skill tool to load the skill with ID exactly "${id}", then follow its full instructions. Ask me what I want to do before making any changes.`
                await submit(sessionID, text, prompt, delivery)
              },
            })
          }
        },
      })

      registration = next as { dispose(): Promise<void> } | undefined
      await previous?.dispose()
    }

    let timer: ReturnType<typeof setInterval> | undefined
    try {
      timer = setInterval(() => {
        void build().catch(() => {})
      }, POLL_MS)
      await build()
    } catch (error) {
      console.error("[skill-commands] setup failed:", error)
    }

    return () => {
      if (timer) clearInterval(timer)
      void registration?.dispose()
    }
  },
})
