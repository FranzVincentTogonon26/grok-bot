"use client"

import { useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { PlusIcon, ShuffleIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { botFormSchema, type BotFormValues } from "@/db/validation"

const JOB_PRESETS = [
  {
    job: "Research assistant",
    instructions:
      "Find sources, summarize them faithfully, and cite every claim. Say when the evidence is thin.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Review changes for bugs, security issues, and unclear code. Point to the exact lines and suggest a fix.",
  },
  {
    job: "Writing editor",
    instructions:
      "Tighten prose, fix grammar, and keep the author's voice. Show what changed and why.",
  },
  {
    job: "Tutor",
    instructions:
      "Explain step by step, check understanding with questions, and adapt to the learner's pace.",
  },
]

type BotDialogProps = {
  /** Controlled open state; omit to render the built-in trigger button. */
  open?: boolean
  /** Controlled setter, paired with `open`. */
  onOpenChange?: (open: boolean) => void
  /** Content of the built-in trigger button; ignored when controlled. */
  trigger?: ReactNode
  /**
   * When set, the dialog edits this bot instead of creating one. Used
   * controlled, from the chat header's avatar + name button.
   */
  bot?: {
    id: string
    name: string
    job: string
    instructions: string | null
    avatar: string
  }
}

export function BotDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
  bot,
}: BotDialogProps) {
  const [openState, setOpenState] = useState(false)
  const [seed, setSeed] = useState(() => bot?.avatar ?? nanoid())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  // Uncontrolled by default; controlled when `open` is passed.
  const open = openProp ?? openState
  const setOpen = onOpenChangeProp ?? setOpenState

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BotFormValues, unknown, BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: bot
      ? { name: bot.name, job: bot.job, instructions: bot.instructions ?? "" }
      : { name: "", job: "", instructions: "" },
  })

  async function onSubmit(values: BotFormValues) {
    const result = bot
      ? await updateBot({ ...values, botId: bot.id, avatar: seed })
      : await createBot({ ...values, avatar: seed })

    if (!result.ok) {
      toast.add({
        title: bot ? "Couldn't update bot" : "Couldn't create bot",
        description: result.error,
        type: "error",
      })
      return
    }

    if (bot) {
      toast.add({
        title: "Bot updated",
        description: `${values.name} has been updated.`,
        type: "success",
      })
    } else {
      toast.add({
        title: "Bot created",
        description: `${values.name} is ready to chat.`,
        type: "success",
      })
      reset()
      setSeed(nanoid()) // fresh face for the next open
    }

    setOpen(false)
  }

  async function handleDelete() {
    if (!bot) return

    const result = await deleteBot({ botId: bot.id })
    if (!result.ok) {
      toast.add({
        title: "Couldn't delete bot",
        description: result.error,
        type: "error",
      })
      setConfirmOpen(false)
      return
    }

    toast.add({
      title: "Bot deleted",
      description: `${bot.name} is gone.`,
      type: "success",
    })
    setConfirmOpen(false)
    setOpen(false)
    // The chat no longer exists — leave the now-404 page.
    router.push("/")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      {openProp === undefined && (
        <DialogTrigger
          render={<Button variant="secondary" className="rounded-full" />}
        >
          {trigger ?? (
            <>
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{bot ? "Edit bot" : "New bot"}</DialogTitle>
            <DialogDescription>
              {bot
                ? "Update its face, name, or job to do."
                : "Give it a face, a name, and a job to do."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {JOB_PRESETS.map((preset) => (
              <Button
                key={preset.job}
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setValue("job", preset.job, { shouldValidate: true })
                  setValue("instructions", preset.instructions, {
                    shouldValidate: true,
                  })
                }}
              >
                {preset.job}
              </Button>
            ))}
          </div>

          <FieldGroup>
            <Field>
              <div className="flex items-center gap-3">
                <ChatAvatar seed={seed} className="size-10" />
                <FieldContent>
                  <FieldTitle>Face</FieldTitle>
                  <FieldDescription>
                    Shuffle until you find one you like.
                  </FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setSeed(nanoid())}
                >
                  <ShuffleIcon data-icon="inline-start" />
                  Shuffle
                </Button>
              </div>
            </Field>

            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                id="bot-name"
                placeholder="Ada"
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={errors.job ? true : undefined}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                id="bot-job"
                placeholder="Research assistant"
                aria-invalid={errors.job ? true : undefined}
                {...register("job")}
              />
              <FieldError errors={[errors.job]} />
            </Field>

            <Field data-invalid={errors.instructions ? true : undefined}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                className="min-h-24"
                aria-invalid={errors.instructions ? true : undefined}
                {...register("instructions")}
              />
              <FieldError errors={[errors.instructions]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            {bot && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={isSubmitting}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            )}
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>

      {bot && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the bot and its chat. This can&apos;t
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
