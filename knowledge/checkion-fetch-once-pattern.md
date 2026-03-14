# Fetch-Once-per-ID Pattern (Performance)

## Problem
Project pages (Overview, SEO, WCAG, GEO) and `ProjectHeaderNav` were re-running data-fetch effects on re-renders or under React Strict Mode, causing duplicate requests and UI flicker.

## Solution
- **`hooks/useFetchOnceForId.ts`**: Returns a ref that stores the last `id` we started loading for. At the start of the data-loading effect: `if (ref.current === id) return; ref.current = id;` so the effect body runs only once per route/id. When the user navigates to another project, `id` changes so `ref.current !== id` and we run again.
- **Single combined effect**: Replace multiple `useEffect` + `useCallback(loadX, [id])` with one effect that fetches all needed data in parallel (e.g. project + ranking + geo + domain summary) and sets all state. No separate “load project” effect that could re-run.
- **AbortController**: Create `const ac = new AbortController()` in the effect, pass `signal: ac.signal` to `fetch()`, and `return () => ac.abort()` so in-flight requests are aborted on unmount or when `id` changes; guard every `setState` with `if (!signal.aborted)` to avoid updates after unmount.

## Where it’s used
- `app/projects/[id]/page.tsx` – one effect: project + ranking + geo + domain-summary-all (parallel).
- `app/projects/[id]/seo/page.tsx` – one effect: project + domain summary → scan summary (sequential for scan).
- `app/projects/[id]/wcag/page.tsx` – one effect: project + domain summary + domain-summary-all → scan summary.
- `app/projects/[id]/geo/page.tsx` – one effect: project + geo history + geo summary + question history (parallel).
- `components/ProjectHeaderNav.tsx` – one effect: project name only, with ref + abort.

Manual refetch (e.g. after PATCH add/remove competitor) still uses `loadProject()` or similar; the ref only prevents the *initial* effect from running more than once per `id`.
