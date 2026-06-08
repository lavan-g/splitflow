# SplitFlow Folder Structure

This repository follows a feature-first structure, with shared infrastructure separated into `lib`, `components`, and typed contracts in `types`.

```text
src/
  app/
    (auth)/
      login/
      signup/
      forgot-password/
    (app)/
      dashboard/
      profile/
      groups/
      groups/[id]/
      expenses/new/
      expenses/[id]/
      settlements/
    api/
  features/
    auth/
      actions/
      components/
      hooks/
      schemas/
      types/
    profiles/
      actions/
      components/
      hooks/
      schemas/
      types/
    groups/
      actions/
      components/
      hooks/
      schemas/
      services/
      types/
    expenses/
      actions/
      components/
      hooks/
      schemas/
      services/
      types/
    balances/
      components/
      hooks/
      services/
      types/
    settlements/
      actions/
      components/
      hooks/
      schemas/
      services/
      types/
    realtime/
      hooks/
      services/
      types/
    search/
      components/
      hooks/
      services/
      types/
  components/
    ui/
    layout/
    shared/
  lib/
    supabase/
    validation/
    formatting/
    constants/
    utils/
  providers/
  types/
supabase/
  migrations/
```

Design principles:

- Keep business rules inside `features/*/services`.
- Keep mutation boundaries inside `features/*/actions`.
- Keep schemas close to the feature in `features/*/schemas`.
- Keep cross-feature utilities inside `lib/*`.
- Keep database contracts in `src/types`.
