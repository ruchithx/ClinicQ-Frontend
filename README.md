# Dispensary Management System — Frontend

Next.js App Router frontend for the Dispensary Management System (DMS).

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI primitives | shadcn/ui (Radix UI) |
| Data fetching | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod 4 |
| API mocking | MSW 2 |
| Unit tests | Vitest 3 + Testing Library |
| E2E tests | Playwright |

## Getting started

```bash
cd frontend
npm install
cp .env.example .env.local   # edit if the backend URL differs
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript type-check (no emit) |
| `npm run lint` | ESLint with `--max-warnings=0` |
| `npm run test` | Vitest unit tests with coverage |
| `npm run test:watch` | Vitest in watch mode |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run gen:api` | Regenerate types from `../docs/openapi.yaml` |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_PATH` | `/api/v1` | Backend API base path (proxied by Next.js) |
| `NEXT_PUBLIC_APP_NAME` | `Dispensary Management System` | App display name |
| `NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS` | `5000` | Public queue refresh interval |
| `NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS` | `10000` | Prescription list refresh interval |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` | `30` | Idle logout timeout |

No secrets belong in `NEXT_PUBLIC_*` variables or anywhere in source.

## Architecture

```
src/
  app/
    (public)/          # Unauthenticated routes: /login, /public/queue
    (staff)/           # Authenticated routes: /doctor/*, /pharmacist/*, /queue/*, /admin/*
  features/            # Feature modules (auth, patients, consultations, pharmacy, queue, …)
  components/          # Shared UI components (StatusBadge, PageHeader, ErrorPanel, …)
  components/ui/       # shadcn/ui primitives
  lib/
    api/               # client.ts (fetch wrapper), endpoints.ts, types.ts, problem.ts
    auth/              # token-store, roles
    validation/        # Zod schemas
```

Route groups keep public and staff layouts separate. Staff routes are wrapped in `RequireAuth`; role-restricted pages pass a `roles` prop.

Access tokens are stored in memory only (never localStorage/sessionStorage). Refresh tokens are HttpOnly cookies. Token refresh is handled transparently by the API client on 401.

## Testing

Unit tests use Vitest + jsdom + React Testing Library + MSW. Each `FT-*` file covers a feature area end-to-end (render → API interaction → UI assertion). Coverage threshold is 70 % lines over `src/features/**` and `src/lib/**`.

```bash
npm run test           # run once with coverage report
npm run test:watch     # interactive watch mode
```
