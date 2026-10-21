"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { createGroupChat } from "@/actions/chat"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  groupChatFormSchema,
  type GroupChatFormValues,
} from "@/db/validation"
import type { BotOption } from "@/queries/bots"

export function GroupChatDialog({
  bots,
  open,
  onOpenChange,
}: {
  bots: BotOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupChatFormValues, unknown, GroupChatFormValues>({
    resolver: zodResolver(groupChatFormSchema),
    defaultValues: {
      name: "",
      memberIds: bots.map((bot) => bot.id),
    },
  })

  // Open with the current bot list selected; reopening starts fresh without
  // carrying a stale selection from a bot that has since been deleted.
  useEffect(() => {
    if (open) {
      reset({ name: "", memberIds: bots.map((bot) => bot.id) })
    }
  }, [bots, open, reset])

  async function onSubmit(values: GroupChatFormValues) {
    const result = await createGroupChat(values)

    if (!result.ok) {
      toast.add({
        title: "Couldn't create group chat",
        description: result.error,
        type: "error",
      })
      return
    }

    toast.add({
      title: "Group chat created",
      description: `${values.name} is ready.`,
      type: "success",
    })
    reset({ name: "", memberIds: bots.map((bot) => bot.id) })
    onOpenChange(false)
    router.push(`/chats/${result.chatId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
          <DialogDescription>
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="group-chat-name">Name</FieldLabel>
              <Input
                id="group-chat-name"
                placeholder="Weekend plans"
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={errors.memberIds ? true : undefined}>
              <FieldTitle>Bots</FieldTitle>
              <FieldDescription>
                Pick at least two. The selected bot answers each message.
              </FieldDescription>
              <Controller
                control={control}
                name="memberIds"
                render={({ field }) => {
                  const selected = field.value ?? []

                  return (
                    <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                      {bots.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          Create at least two bots first.
                        </p>
                      ) : (
                        bots.map((bot) => {
                          const checked = selected.includes(bot.id)

                          return (
                            <div
                              key={bot.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5"
                              onClick={() => {
                                field.onChange(
                                  checked
                                    ? selected.filter((id) => id !== bot.id)
                                    : [...selected, bot.id],
                                )
                              }}
                            >
                              {/* The row toggles too, so keep a checkbox click
                                  from toggling it a second time. */}
                              <span
                                className="flex shrink-0"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Checkbox
                                  checked={checked}
                                  aria-label={`Include ${bot.name}`}
                                  onCheckedChange={(next) => {
                                    field.onChange(
                                      next
                                        ? [...selected, bot.id]
                                        : selected.filter((id) => id !== bot.id),
                                    )
                                  }}
                                />
                              </span>
                              <ChatAvatar
                                seed={bot.avatar}
                                className="size-6 shrink-0"
                              />
                              <span className="truncate text-sm font-medium">
                                {bot.name}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )
                }}
              />
              <FieldError errors={[errors.memberIds]} />
              {bots.length === 1 && (
                <FieldDescription>
                  A group chat needs at least two bots.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || bots.length < 2}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
