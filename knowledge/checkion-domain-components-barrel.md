# CHECKION – Domain result components (`components/domain`)

## Barrel

- **Import for app and tests:** `import { DomainResultMain, … } from '@/components/domain'`.
- **`DomainResultMain.tsx`** imports tab sections via **relative paths** (`./DomainResultOverviewSection`, …), **not** from `@/components/domain`, so the barrel can re-export `DomainResultMain` without a circular dependency.
