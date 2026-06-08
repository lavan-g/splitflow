# SplitFlow Feature Modules

Each feature owns its UI, validation, business logic, and strongly typed contracts.

- `auth`: signup, login, logout, password reset.
- `profiles`: profile management and user identity (`SF-XXXXXX`).
- `groups`: group creation, join/leave, and member management.
- `expenses`: expense creation, split strategies, and receipt metadata.
- `balances`: derived balance calculations and summaries.
- `settlements`: settlement lifecycle (`pending` to `settled`).
- `realtime`: Supabase realtime subscriptions and stream handling.
- `search`: user discovery by unique user ID.
