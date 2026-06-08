# SplitFlow

Modern expense sharing without phone numbers.

Users identify each other with generated IDs like `SF-9X4K2M`, create groups with `GRP-XXXXXX` codes, split expenses, and settle balances.

## Tech Stack

- Next.js App Router
- TypeScript (strict mode)
- TailwindCSS
- Supabase (Auth, Postgres, Storage, Realtime)
- React Hook Form + Zod
- TanStack Query
- Framer Motion

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

3. Add your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Apply database migrations in Supabase:

```bash
# via Supabase CLI in your own environment
supabase db push
```

5. Run the app:

```bash
npm run dev
```

## Current Deliverables

- Feature-based folder scaffold under `src/`
- Initial Supabase schema + RLS + storage policies:
  - `supabase/migrations/20260608184000_initial_schema.sql`
- Shared database types in `src/types/database.ts`
- Route scaffold for:
  - `/login`
  - `/signup`
  - `/dashboard`
  - `/profile`
  - `/groups`
  - `/groups/[id]`
  - `/expenses/new`
  - `/expenses/[id]`
  - `/settlements`

## Next Implementation Milestones

- Complete Supabase Auth flow (signup/signin/signout/reset) with generated `SF-XXXXXX` IDs
- Protected routes and session persistence
- Group and member management
- Expense creation and split engines (equal, percentage, custom)
- Balance engine, settlements, and realtime updates
