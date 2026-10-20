"use client"

import { useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { PlusIcon, ShuffleIcon } from "lucide-react"
import { useForm } from "react-hook-form"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
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
}

export function BotDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}: BotDialogProps) {
  const [openState, setOpenState] = useState(false)
  const [seed, setSeed] = useState(() => nanoid())

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
    defaultValues: { name: "", job: "", instructions: "" },
  })

  async function onSubmit(values: BotFormValues) {
    const result = await createBot({ ...values, avatar: seed })
    if (!result.ok) {
      toast.add({
        title: "Couldn't create bot",
        description: result.error,
        type: "error",
      })
      return
    }

    toast.add({
      title: "Bot created",
      description: `${values.name} is ready to chat.`,
      type: "success",
    })
    setOpen(false)
    reset()
    setSeed(nanoid()) // fresh face for the next open
  }

  return (
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
            <DialogTitle>New bot</DialogTitle>
            <DialogDescription>
              Give it a face, a name, and a job to do.
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
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
