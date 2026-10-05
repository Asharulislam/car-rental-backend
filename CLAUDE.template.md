# <Project> Backend — architecture & conventions

> **Template.** Copy this file into a project as `CLAUDE.md`, then fill in every
> `<...>` placeholder and delete the sections that don't apply. The rules below
> are the pattern to follow; the placeholders are the project's own facts.

**Stack:** Express + TypeScript + Prisma (Postgres) + zod. Adjust the names if a
project swaps a piece — the layering and file conventions stay the same.

## Commands

- `npm run dev` — <watch-mode command>
- `npm start` — <production start command>
- `npm test` — <test command, or note that there is no test suite>
- `npx prisma migrate dev` — apply schema changes locally

## Folder structure

```
src/
  index.ts                  # loads env, starts the server on PORT
  app.ts                    # express app: parsers, /health, docs, route mounting
  middlewares/
    auth.middleware.ts      # authenticate (token -> req.user), authorize(...roles)
  core/                     # shared infrastructure — no feature logic lives here
    config/
      prisma.ts             # the single PrismaClient, default export
      <service>.ts          # other clients (storage, mailer, queue, cache)
    utils/                  # small pure helpers (jwt, otp, hashing, dates)
    services/               # shared side-effecting services (email, push, sms)
    docs/
      openapi.ts            # API spec, default export
  modules/                  # one folder per feature, four files each
    <feature>/
  generated/prisma/         # Prisma-generated client — never edit by hand
prisma/
  schema.prisma             # single source of truth for the DB
```

Rules that keep this structure honest:

- Anything imported by two or more modules belongs in `core/`, not in whichever
  module wrote it first.
- `core/` must never import from `modules/`. Dependencies point inward only.
- Cross-module reuse goes through the other module's **service**, never its
  controller or routes.
- Generated output is read-only. Change the schema and regenerate.

## Module layout

Every feature is a folder under `src/modules/` with four files named after it:

```
src/modules/<name>/
  <name>.routes.ts        # express Router: paths, auth guards, controller handlers
  <name>.controller.ts    # HTTP layer: validate input, map errors to status codes
  <name>.service.ts       # business logic + all database access
  <name>.validation.ts    # zod schemas + inferred input types
```

Use one consistent prefix per module and keep it identical across the four
files. Pick singular or plural once and don't mix (`order.routes.ts`,
`order.service.ts` — not `orders.routes.ts` beside `order.service.ts`).

Add a fifth file only when it earns its place — `<name>.types.ts` for shared
types, `<name>.helpers.ts` for private pure functions. Don't create `utils.ts`
grab bags.

### Layer rules

| Layer | May import | Must never |
|---|---|---|
| routes | middlewares, its controller, enums | contain logic, touch the db |
| controller | its service, its validation | import `prisma`, write queries |
| service | `core/*`, its validation, other services | touch `req`/`res`, set status codes |
| validation | `zod` only | import anything project-specific |

- **Routes** only wire things up — path, guards, handler:
  `router.post("/", authenticate, authorize(Role.<role>), create)`.
  Guards belong here, not inside controllers.
- **Controllers** take `(req: Request, res: Response)`, parse input with
  `safeParse`, call the service, return `res.status(...).json(...)`. One
  exported handler per endpoint, named for the action (`create`, `list`,
  `getOne`, `update`, `remove`) — not for the HTTP verb.
- **Services** are plain exported async functions taking primitives and
  validated objects (`createThing(userId, input)`). They return data and own
  every `prisma.*` call. A service is callable from a script, a job or another
  service, so it can't know about HTTP.
- **Validation** exports one schema per operation plus its inferred type, which
  the service uses as its input type. The schema is the only place input shape
  is described.

### Error handling

No global error middleware and no `asyncHandler` wrapper — each controller
wraps its own body in `try/catch`.

Services signal expected failures by throwing `Error` with an
UPPER_SNAKE_CASE code. Controllers translate codes to status codes. Codes are
part of the service's contract: name them after the condition, not the status.

```ts
// service
if (!parent) throw new Error('PARENT_NOT_FOUND')
if (parent.ownerId !== userId) throw new Error('FORBIDDEN')

// controller
catch (err: any) {
  if (err.message === 'PARENT_NOT_FOUND') return res.status(404).json({ error: 'not found' })
  if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'forbidden' })
  console.error(err)
  return res.status(500).json({ error: 'something went wrong' })
}
```

Keep response shapes identical across every module:

- validation failure → `400 { error: 'validation failed', details: string[] }`
  built from `parsed.error.issues.map(i => i.message)`
- known failure → `404` / `403` / `409` / `400` with `{ error: '<lowercase message>' }`
- unexpected → `console.error(err)` then `500 { error: 'something went wrong' }`

Never leak a raw `err.message`, a stack trace or a Prisma error into a
response. Log it, return the generic 500.

### Auth & ownership

`authenticate` verifies the token and attaches `req.user = { userId, role }`.
`authorize(...roles)` checks the role. Roles come from the generated Prisma
enum, never string literals.

Controllers read the caller as `req.user!.userId` and pass it into the service.
**Every service function that touches a user-owned row takes the caller's id and
scopes the query by it.** Resolve the owned parent first, then verify the child
belongs to it:

```ts
const parent = await prisma.parent.findUnique({ where: { ownerId } })
if (!parent) throw new Error('PARENT_NOT_FOUND')

const child = await prisma.child.findUnique({ where: { id: childId } })
if (!child || child.parentId !== parent.id) throw new Error('CHILD_NOT_FOUND')
```

An id arriving from `req.params` or `req.body` is never trusted on its own —
a route guarded only by `authenticate` still lets any signed-in user pass any
id. Return the not-found code rather than a forbidden one for rows the caller
shouldn't know exist.

### File uploads

Never proxy file bytes through the API. The database stores the storage
**key** (`<thing>ImageKey`), never a URL:

1. Client requests a presigned upload URL from the upload module.
2. Client uploads directly to object storage.
3. Client sends the returned key with the create/update request.
4. On read, the service converts keys to short-lived view URLs and exposes them
   as `<thing>ImageUrl`.

URLs expire, so they are computed per response and never persisted.

### Database

- Import the shared client: `import prisma from '../../core/config/prisma'`.
  Never construct a second `PrismaClient` — connection pools leak.
- `prisma/schema.prisma` is the source of truth. Change it, migrate, regenerate;
  don't hand-edit generated files or write raw DDL.
- Import enums from the generated client so DB values and code stay in step.
- Use `prisma.$transaction` for multi-write operations that must not half-apply.
- `orderBy` every `findMany` that feeds a list endpoint — unordered pages
  shuffle between requests.

### API documentation

Keep `src/core/docs/openapi.ts` in step with the validators. If the spec is
hand-written, nothing enforces this — so above each request schema leave a
comment naming its source:

```ts
// mirrors createThingSchema in modules/thing/thing.validation.ts
```

Changing a validator without changing the spec is an incomplete change.

## Adding a module — checklist

1. Add the model to `prisma/schema.prisma`, then migrate and regenerate.
2. Create `src/modules/<name>/` with the four files below.
3. Mount it in `src/app.ts`: `app.use("/<name>", <name>Routes)`.
4. Document the endpoints in `src/core/docs/openapi.ts` — tag, schemas, paths.
5. Re-read the layer table above and confirm nothing crossed a boundary.

### Skeleton

```ts
// <name>.validation.ts
import { z } from 'zod'

export const createThingSchema = z.object({
  title: z.string().min(2, 'title must be at least 2 characters'),
})

export const updateThingSchema = z.object({
  title: z.string().min(2).optional(),
})

export type CreateThingInput = z.infer<typeof createThingSchema>
export type UpdateThingInput = z.infer<typeof updateThingSchema>
```

```ts
// <name>.service.ts
import prisma from '../../core/config/prisma'
import { CreateThingInput, UpdateThingInput } from './<name>.validation'

export async function createThing(ownerId: string, input: CreateThingInput) {
  const parent = await prisma.parent.findUnique({ where: { ownerId } })
  if (!parent) throw new Error('PARENT_NOT_FOUND')

  return prisma.thing.create({ data: { ...input, parentId: parent.id } })
}

export async function getThings(ownerId: string) {
  const parent = await prisma.parent.findUnique({ where: { ownerId } })
  if (!parent) throw new Error('PARENT_NOT_FOUND')

  return prisma.thing.findMany({
    where: { parentId: parent.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateThing(ownerId: string, thingId: string, input: UpdateThingInput) {
  const parent = await prisma.parent.findUnique({ where: { ownerId } })
  if (!parent) throw new Error('PARENT_NOT_FOUND')

  const thing = await prisma.thing.findUnique({ where: { id: thingId } })
  if (!thing || thing.parentId !== parent.id) throw new Error('THING_NOT_FOUND')

  return prisma.thing.update({ where: { id: thingId }, data: input })
}

export async function deleteThing(ownerId: string, thingId: string) {
  const parent = await prisma.parent.findUnique({ where: { ownerId } })
  if (!parent) throw new Error('PARENT_NOT_FOUND')

  const thing = await prisma.thing.findUnique({ where: { id: thingId } })
  if (!thing || thing.parentId !== parent.id) throw new Error('THING_NOT_FOUND')

  await prisma.thing.delete({ where: { id: thingId } })
  return { success: true }
}
```

```ts
// <name>.controller.ts
import { Request, Response } from 'express'
import { createThing, deleteThing, getThings, updateThing } from './<name>.service'
import { createThingSchema, updateThingSchema } from './<name>.validation'

export async function create(req: Request, res: Response) {
  try {
    const ownerId = req.user!.userId

    const parsed = createThingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: parsed.error.issues.map(i => i.message),
      })
    }

    const thing = await createThing(ownerId, parsed.data)
    return res.status(201).json(thing)
  } catch (err: any) {
    if (err.message === 'PARENT_NOT_FOUND') return res.status(404).json({ error: 'not found' })
    console.error(err)
    return res.status(500).json({ error: 'something went wrong' })
  }
}

export async function list(req: Request, res: Response) {
  try {
    const things = await getThings(req.user!.userId)
    return res.status(200).json(things)
  } catch (err: any) {
    if (err.message === 'PARENT_NOT_FOUND') return res.status(404).json({ error: 'not found' })
    console.error(err)
    return res.status(500).json({ error: 'something went wrong' })
  }
}

export async function update(req: Request, res: Response) {
  try {
    const ownerId = req.user!.userId
    const thingId = String(req.params.id)

    const parsed = updateThingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: parsed.error.issues.map(i => i.message),
      })
    }

    const thing = await updateThing(ownerId, thingId, parsed.data)
    return res.status(200).json(thing)
  } catch (err: any) {
    if (err.message === 'PARENT_NOT_FOUND') return res.status(404).json({ error: 'not found' })
    if (err.message === 'THING_NOT_FOUND') return res.status(404).json({ error: 'thing not found' })
    console.error(err)
    return res.status(500).json({ error: 'something went wrong' })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const result = await deleteThing(req.user!.userId, String(req.params.id))
    return res.status(200).json(result)
  } catch (err: any) {
    if (err.message === 'PARENT_NOT_FOUND') return res.status(404).json({ error: 'not found' })
    if (err.message === 'THING_NOT_FOUND') return res.status(404).json({ error: 'thing not found' })
    console.error(err)
    return res.status(500).json({ error: 'something went wrong' })
  }
}
```

```ts
// <name>.routes.ts
import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/auth.middleware'
import { Role } from '../../generated/prisma/enums'
import { create, list, remove, update } from './<name>.controller'

const router = Router()

router.post('/', authenticate, authorize(Role.<role>), create)
router.get('/', authenticate, authorize(Role.<role>), list)
router.patch('/:id', authenticate, authorize(Role.<role>), update)
router.delete('/:id', authenticate, authorize(Role.<role>), remove)

export default router
```

## Environment

Read from `.env` via `dotenv`; `.env` is never committed. Keep a committed
`.env.example` listing every key with a dummy value.

Required in every project: `<DATABASE_URL>`, `<JWT_SECRET>`, plus whatever the
integrations need. Optional: `PORT` (default 3000), `NODE_ENV`.

Config modules in `core/config/` throw at import time when a required variable
is missing:

```ts
const value = process.env.<KEY>
if (!value) throw new Error('<KEY> is not set in .env')
```

Keep that behaviour. A misconfigured deploy should fail at boot, not on the
first request that happens to need the value. Read env vars only in
`core/config/*` and `index.ts` — never scattered through services.

## Conventions summary

- Files: `<module>.<layer>.ts` in `src/modules/<module>/`.
- Services: verb + noun (`createThing`, `getThings`, `deleteThing`).
- Controllers: bare action (`create`, `list`, `getOne`, `update`, `remove`).
- Schemas: `<action><Thing>Schema`; types: `<Action><Thing>Input`.
- Error codes: `UPPER_SNAKE_CASE`, thrown by services, mapped by controllers.
- Storage columns: `<thing>ImageKey` in the db, `<thing>ImageUrl` in responses.
- Every list endpoint has an explicit `orderBy`.
- Every owned row is scoped by the caller's id in the service.
