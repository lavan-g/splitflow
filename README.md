# SplitFlow

Modern expense sharing without phone numbers.

Users identify each other with generated IDs like `SF-9X4K2M`, create groups with `GRP-XXXXXX` codes, split expenses, and settle balances.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript (strict mode)
- TailwindCSS 4
- Supabase (Auth, Postgres, Storage, Realtime)
- Zod + Server Actions
- Vitest (unit tests)

## Features

- **Auth** — Sign up, sign in, sign out, forgot/reset password, email confirmation flow
- **Profile** — Edit name/username, avatar upload, unique `SF-XXXXXX` ID
- **Groups** — Create, join, leave, delete, share code, search/add members by username or ID, remove members (owner)
- **Expenses** — Create with equal/percentage/custom splits, receipt upload, list with group filter, view, full edit, delete
- **Balances** — Global dashboard summary, per-group breakdown, per-person owed/owing
- **Settlements** — Record payments, auto-suggest amounts from balances, receiver confirms, history
- **Realtime** — Pages refresh when expenses or settlements change

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

4. Apply database migrations:

```bash
supabase db push
```

Migrations include the core schema, RLS policies, receipts storage, avatars bucket, and realtime publication.

5. Run the app:

```bash
npm run dev
```

6. Run tests:

```bash
npm test
```

## App Routes

| Route | Description |
|---|---|
| `/login`, `/signup`, `/signup/confirm` | Authentication |
| `/dashboard` | Balance summary, groups, recent expenses |
| `/groups`, `/groups/[id]` | Group list and details with per-group balance |
| `/expenses`, `/expenses/new`, `/expenses/[id]` | Expense list, create, detail |
| `/expenses/[id]/edit` | Full expense editing |
| `/settlements` | Record and track payments |
| `/profile` | Profile and avatar settings |

## Project Structure

```
src/
  app/           # Next.js routes (auth + app shells)
  features/      # Domain modules (auth, groups, expenses, balance, settlements, profile)
  lib/           # Supabase clients, env validation, shared utilities
  types/         # Generated database types
supabase/
  migrations/    # Postgres schema, RLS, storage, realtime
```

## Supabase Notes

- Configure **custom SMTP** (e.g. Resend) in Supabase Auth settings for reliable password reset emails.
- Add your site URL and redirect URLs in Supabase Auth → URL Configuration (`/auth/callback`, `/reset-password`).
- The service role key is required server-side for admin lookups that bypass RLS (group join by code, user search, balance aggregation).
