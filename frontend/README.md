# Dispensary Management System — Frontend

Next.js 16 App Router frontend for the Dispensary Management System (DMS).

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui components |
| Data fetching | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod 4 |
| API mocking (tests) | MSW 2 |
| Unit tests | Vitest 3 + Testing Library |
| E2E tests | Playwright |
| Linting | ESLint 9 (flat config) + React Compiler plugin |

## Getting Started

```bash
npm install

# Copy environment template and configure the API base URL
cp .env.example .env.local

npm run dev       # http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE` | Absolute URL of the backend API (e.g. `http://localhost:8080`) — **no trailing slash** |

No secrets are placed in `NEXT_PUBLIC_*` variables or in source code.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (zero warnings allowed)
npm run typecheck    # TypeScript type check (no emit)
npm run test         # Vitest unit tests + coverage report
npm run test:watch   # Vitest in watch mode
npm run e2e          # Playwright end-to-end tests
npm run gen:api      # Regenerate types from openapi.yaml
```

## Architecture

### Route Groups

```
src/app/
  (public)/         Public (unauthenticated) routes
    login/
    public/queue/   Live queue board (patient-facing)
  (staff)/          Authenticated staff routes
    doctor/         Doctor workflow
    pharmacist/     Pharmacist workflow
    queue/          Queue session management
    medicines/      Medicine catalogue
    admin/          Admin: users and audit log
  forbidden/        403 landing page
```

### Feature Modules (`src/features/`)

Each subdirectory owns the UI components for one domain:

| Directory | Domain |
|---|---|
| `auth/` | Login, change password, idle logout, route guards |
| `patients/` | Patient registration and search |
| `consultations/` | Consultation + prescription creation and detail |
| `prescriptions/` | Prescription list (doctor view) |
| `pharmacy/` | Dispense workflow (pharmacist view) |
| `queue/` | Public queue display and staff queue management |
| `bookings/` | Booking form |
| `medicines/` | Medicine catalogue |
| `admin/` | User management, audit events |

### API Layer (`src/lib/api/`)

- `schema.d.ts` — Auto-generated types (run `npm run gen:api` to update)
- `types.ts` — Re-exported friendly aliases for the schema types
- `endpoints.ts` — One typed function per OpenAPI operationId
- `client.ts` — Fetch wrapper: adds auth header, handles 401 token refresh, parses Problem responses
- `problem.ts` — `ApiError` class, `applyFieldErrors` for React Hook Form
- `query-keys.ts` — Centralized TanStack Query key factories

### Auth (`src/lib/auth/`)

Access tokens are stored **in memory only** (via `token-store.ts`). Refresh tokens live in an `HttpOnly` cookie managed by the backend. No PHI or credentials are stored in `localStorage` / `sessionStorage`.

## Testing

```bash
npm run test        # Run all unit tests and print coverage
```

- Test files live under `tests/` and follow the `FT-NN-*.test.tsx` naming convention (one file per feature area).
- `tests/mocks/handlers.ts` exports MSW request handlers for every API endpoint.
- `tests/utils/render.tsx` provides `renderWithProviders` (QueryClient only) and `renderAuthenticated` (with mocked auth context).
- Coverage threshold: **70% lines** on `src/features/**` and `src/lib/**`.

## Security Notes

- Route protection is enforced both by `RequireAuth` (renders nothing + redirects) and by server-side 403 responses — hiding a button is not access control.
- Every role-restricted page passes a `roles` prop to `RequireAuth`; a 403 from the API renders a dedicated error state.
- Forms use `Idempotency-Key` headers for mutating requests where the API requires it.
- Raw server error messages are never shown to users; only stable error codes from `error-messages.ts` are displayed.
