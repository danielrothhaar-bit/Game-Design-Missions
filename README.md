# Quests

Project management and gamification for The Escape Game's design studio. Think
Monday/Asana, tailored to escape-room production, with XP, levels, and badges
baked in.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **PostgreSQL** (Railway managed) via **Drizzle ORM**
- **Auth.js v5** — dev credentials now, Google SSO ready to flip on
- **Tailwind v4** + **shadcn/ui** (Base UI primitives)
- **TanStack Table**, **dnd-kit**, **Recharts**

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

Required:

| Var               | Notes                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`    | Postgres connection string (`postgres://user:pass@host:5432/quests`)  |
| `AUTH_SECRET`     | `openssl rand -base64 32`                                             |
| `DEV_PASSCODE`    | Single shared studio passcode used by every dev sign-in               |
| `EMAIL_ALLOWLIST` | Comma-separated list of allowed emails *or* domains                   |

Optional (flip on later):

| Var                                       | Purpose                          |
| ----------------------------------------- | -------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables Google SSO automatically |
| `RESEND_API_KEY` / `EMAIL_FROM`           | Daily email digests              |

### 3. Spin up Postgres locally

Easiest path is Docker:

```bash
docker run --name quests-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=quests -p 5432:5432 -d postgres:16
```

Set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/quests` in
`.env.local`.

### 4. Run migrations + seed

```bash
npm run db:migrate
npm run db:seed
```

The seed creates 4 users, 2 sample games, ~20 tasks, sample XP events,
badges, and streaks. Sign in with any of the seeded emails:

- `daniel@theescapegame.com` (owner)
- `morgan@theescapegame.com` (admin)
- `kai@theescapegame.com` (designer)
- `sam@theescapegame.com` (designer)

…and whatever `DEV_PASSCODE` you set.

### 5. Run the dev server

```bash
npm run dev
```

Visit <http://localhost:3000>.

## Scripts

| Script                | What it does                              |
| --------------------- | ----------------------------------------- |
| `npm run dev`         | Dev server (Turbopack)                    |
| `npm run build`       | Production build                          |
| `npm start`           | Run the production build                  |
| `npm run typecheck`   | `tsc --noEmit`                            |
| `npm run lint`        | ESLint                                    |
| `npm run db:generate` | Generate a new migration from `schema.ts` |
| `npm run db:migrate`  | Apply pending migrations                  |
| `npm run db:push`     | Push schema directly (dev only)           |
| `npm run db:studio`   | Open Drizzle Studio                       |
| `npm run db:seed`     | Reset + seed local data                   |

## Deploying to Railway

1. Create a new project on Railway and connect this GitHub repo.
2. Add the **Postgres** plugin. Railway will inject `DATABASE_URL`.
3. Add the remaining env vars (`AUTH_SECRET`, `DEV_PASSCODE`,
   `EMAIL_ALLOWLIST`, `NEXT_PUBLIC_APP_URL`) under **Variables**.
4. First deploy will run `npm run build`. The `railway.json` start command
   runs `db:migrate` then `npm start`, so schema is always up to date.

## Enabling Google SSO (later)

1. Create an OAuth client in Google Cloud Console.
   - Authorized redirect: `https://<your-domain>/api/auth/callback/google`
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway.
3. Redeploy. The Google button appears automatically and the dev credentials
   provider can be removed once everyone has signed in via Google.

`EMAIL_ALLOWLIST` continues to gate which Google accounts can sign in.

## Project layout

```
src/
  app/
    (app)/              # authenticated app shell (sidebar + topbar)
      my-work/          # personal queue
      dashboard/        # portfolio dashboard
      games/
        page.tsx        # games index
        [slug]/         # game-level routes
          page.tsx      # List view (default)
          layout.tsx    # game header + tabs
      profile/          # XP, badges, discipline mastery
    login/              # dev sign-in
    api/auth/[...nextauth]/
  components/
    layout/             # sidebar, topbar, command palette
    games/              # task list view, status/priority/assignee pickers
    ui/                 # shadcn primitives
    providers.tsx
  db/
    index.ts            # Drizzle client
    schema.ts           # full schema
    seed.ts             # local seed script
  lib/
    auth.ts             # Auth.js config
    xp.ts               # XP rules + level curve
    badges.ts           # starter badges
    queries.ts          # server query helpers
    format.ts           # label + color helpers
  server/
    actions/
      tasks.ts          # server actions (CRUD + XP engine)
drizzle/                # generated migrations
```

## Roadmap

Phase 1 (this build):
- Games · Phases · Tasks with List view + inline edit
- My Work, Dashboard, Profile
- XP + levels + 5 starter badges + streaks (estimate-scaled)
- Daily activity log per task

Phase 2 (planned): Gantt/timeline, Kanban Board view, automations engine,
playtest capture, custom fields per game.

Phase 3 (planned): vendor tracker, per-game budget, Flow Sheet integration,
post-mortem template, Google SSO turned on.
