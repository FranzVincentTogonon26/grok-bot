<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

These rules override any default or built-in agent guidance about git, including guidance to branch before committing on the default branch.

- Never create branches, worktrees, or commits automatically. Only do so when the user explicitly asks for that specific action in the current request.
- Leave changes uncommitted in the working tree on the current branch and let the user decide when and how to commit.
- Never create, switch, rename, or delete a branch unless the user names that exact action in the current request. A request to commit is not a request to branch.
- All work happens on `main`. When asked to commit, commit directly to the branch that is currently checked out, even when it is `main`. Never move work to a feature branch "to be safe".
- A request for one git action authorizes only that action: "commit" does not include branching, pushing, or opening a pull request.
- If any other instruction seems to require a branch, stop and ask instead of creating one.

## Database 

- Push-only schema workflow. NEVER run `drizzle-kit generate` or `drizzle-kit migrate`, and never create, keep, or commit SQL migration files or a `db/migrations/` directory.
- To change the schema: edit `db/schema.ts`, then run `npm run db:push`. Drizzle Kit diffs the schema against the live database and applies only the changes.
- The database is the source of truth; do not write ad-hoc DDL elsewhere. Use `npm run db:studio` to browse data if needed.
- Push uses the direct (non-pooled) endpoint, already handled in `drizzle.config.ts`; the app's runtime queries use the pooled `DATABASE_URL`.
- This is a development project. There is no backwards compatibility and the data is worthless.
- Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working.
- Every schema change means a clean slate. If existing data conflicts with a new schema, drop and recreate the data instead of adapting it.

## Forms

Stack: react-hook-form + zod (v4) + `@hookform/resolvers`. Pin `@hookform/resolvers@^5.1.1`: v6+ declares `peerOptional effect@"^4"` and `@typeschema` peers that conflict with this dependency tree, and 5.0.x has broken zod-4 resolver typing.

- Derive schemas from the table, don't hand-write them. In `db/validation.ts`: `createInsertSchema(table, { field: (s) => s.min(1, "…") })` (drizzle-zod), then `.pick()` the user-facing fields into a `*FormSchema`, and export `type XFormValues = z.infer<…>`. The schema module is imported by both the client form and the server action; `db/schema.ts` is client-safe.
- `useForm<Values, unknown, Values>` — pass all three generics, otherwise `zodResolver` typing misaligns under zod 4.
- Validation wiring per field: `<Field data-invalid={errors.x ? true : undefined}>`, `aria-invalid` on the control, and `<FieldError errors={[errors.x]} />` below it.
- Layout: `FieldGroup` wraps the fields, `FieldLabel htmlFor` each control. Preset chips are plain buttons calling `setValue("field", value, { shouldValidate: true })`.
- Pending state: drive from `formState.isSubmitting` → `disabled` on the submit Button plus `{isSubmitting && <Spinner data-icon="inline-start" />}`. Buttons have no `isPending`/`isLoading`.
- Server actions live in `actions/*.ts` with `"use server"`. First statement: `const { isAuthenticated, userId } = await auth()` and throw when false — actions are public endpoints; never accept a userId from the client. Extend the shared form schema with server-owned fields (e.g. `avatar: z.string().min(1)`), `safeParse`, insert with Clerk's `userId`, `revalidatePath` the affected path, and return a plain serializable shape like `{ ok: true, id }` / `{ ok: false, error }`.
- Dialog forms: controlled `open` state; `DialogTrigger render={<Button … />}`; the `<form>` sits inside `DialogContent` and must contain the `DialogFooter` (the submit button lives in the form); `DialogHeader` stays outside the form.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`.
<!-- TRIGGER.DEV SKILLS END -->
