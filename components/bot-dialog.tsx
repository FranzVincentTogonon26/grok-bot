"use client"

import { useState } from "react"
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
import { botFormSchema, type BotFormValues } from "@/db/validation"

const JOB_PRESETS = [
  "Research assistant",
  "Code reviewer",
  "Writing editor",
  "Tutor",
]

export function BotDialog() {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState(() => nanoid())

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
    if (!result.ok) return // keep the dialog open

    setOpen(false)
    reset()
    setSeed(nanoid()) // fresh face for the next open
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="secondary" className="rounded-full" />}
      >
        <PlusIcon data-icon="inline-start" />
        Create a new bot
      </DialogTrigger>

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
                key={preset}
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setValue("job", preset, { shouldValidate: true })
                }
              >
                {preset}
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
