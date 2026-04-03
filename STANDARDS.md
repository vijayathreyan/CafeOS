# CafeOS Coding Standards

## Tech Stack
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- Supabase (self-hosted) + React Query
- react-hook-form + zod
- Playwright E2E tests
- ESLint + Prettier + Husky

---

## Architecture Rules
- `src/pages/` — one file per route, no business logic
- `src/hooks/` — all data fetching as custom hooks using React Query
- `src/components/` — shared UI components
- `src/components/ui/` — shadcn/ui base components (NEVER modify)
- `src/lib/` — utilities, supabase client, env validation
- `src/types/` — all TypeScript interfaces and types

---

## UI Standards
- shadcn/ui for ALL UI components — no exceptions
- Never use `window.confirm()`, `window.alert()`, `window.prompt()`
- All confirmations → shadcn AlertDialog
- All notifications → shadcn Toast via `useToast()`
- All form errors → inline below the field using `text-destructive`
- Google Blue `#1A73E8` as primary colour
- Mobile-first — test at 375px and 1280px
- Minimum 48×48px tap targets for all interactive elements
- English/Tamil bilingual support on all staff and supervisor screens

---

## Data Fetching Standards
- React Query for ALL API calls — never `useEffect` for data fetching
- Pattern: `const { data, isLoading, error } = useQuery({...})`
- Every query must have: `enabled: !!session`, `retry: 2`, `staleTime: 30000`
- Custom hook per resource: `useEmployees()`, `useTasks()`, `useSnackItems()` etc.
- Mutations use `useMutation` with `onSuccess` and `onError` handlers
- Loading states show shadcn Skeleton component
- Error states show inline error with Retry button

---

## Form Standards
- `react-hook-form` + zod for ALL forms
- Zod schema defined separately above the component
- All fields validated on blur and on submit
- Mandatory fields show inline red error immediately
- No form can be submitted with validation errors
- Password fields minimum 6 characters
- Phone numbers validated as 10-digit Indian mobile numbers

---

## TypeScript Standards
- Strict mode — zero `any` types
- All interfaces in `src/types/`
- All API responses typed
- All props typed — no implicit any
- JSDoc on all hooks and utility functions

---

## Database Standards
- Never modify existing migration files
- New changes go in next numbered file: `002`, `003` etc.
- Register every migration in `migrations_log` table
- Additive only — no `DROP`, no `ALTER` existing columns without a migration

---

## Testing Standards
- Playwright test for every new feature
- Tests in `tests/e2e/phaseX.spec.ts` per phase
- Test phone numbers use `00000` prefix
- Protected accounts never touched: `9999999999`, `9876543210`, `8888888888`, `9876543211`
- No `waitForTimeout` — use `waitForSelector` and expect visibility
- All tests pass with `retries: 0`

---

## Code Quality Standards
- `npm run lint` must pass with 0 errors
- No `console.log` in production code
- One component per file
- Functions under 50 lines — extract if longer
- No hardcoded strings — use i18n keys for user-facing text

---

## Protected Files — Never Modify
- `nginx/nginx.conf`
- `src/lib/supabase.ts` (auth configuration section)
- `App.tsx` (auth initialisation)
- `AuthContext.tsx` (auth state management)

---

## Commit Standards
- Commit after each feature with descriptive message
- Format: `"Phase X — Feature name — brief description"`
- Always run lint and tests before committing
- Tag stable points: `git tag restore/phaseX-stable`

---

## Session Start Checklist

At the start of every Claude Code session:
1. Read `CONTEXT.md`
2. Read `UFW_Requirements_v3.6_Final.docx`
3. Read `STANDARDS.md`
4. Confirm current phase and what was last built
5. Confirm stable restore point exists before making changes
