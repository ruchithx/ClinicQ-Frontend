# Frontend Implementation Requirements - Dispensary Management System

Version 1.0.0 - 12 October 2026 - target: Next.js frontend, release 1.0

> **For Claude Code.** This file is a complete, binding specification of the frontend. The backend contract is `docs/openapi.yaml`
> (49 operations). All request/response types are **generated** from that file; do not hand-write API types, do not invent
> endpoints, query parameters or fields, and do not rename anything. If a screen seems to need data the contract does not provide,
> stop and report it instead of working around it. Authorisation is enforced by the backend; the frontend only reflects it.
> Do not persist patient or clinical data in browser storage. Do not implement inventory, patient login, notifications or clinical decision support.

Related documents (in `docs/`): `01-Software-Requirements-Specification.pdf` (FR/NFR/BR, use cases), `03-REST-API-Documentation.pdf`
(per-endpoint rules and error codes), `backend-requirements.md`.

## Contents

1. Deliverables and project layout
2. Technology and versions
3. Configuration and environment
4. Runtime proxy, security headers and CSP
5. API client
6. Authentication, session handling and route protection
7. Server state with TanStack Query
8. Forms and validation
9. Design system and UX conventions
10. Screens
11. Security requirements
12. Testing
13. Completion criteria

---

## 1. Deliverables and project layout

The frontend lives in `frontend/` of the mono-repo (see backend-requirements.md section 1). Feature-based organisation:

```text
frontend/
├── package.json, tsconfig.json (strict), next.config.ts, eslint.config.mjs, .prettierrc, components.json (shadcn)
├── Dockerfile
├── src/
│   ├── proxy.ts                         # Next.js 16 proxy: /api forwarding, CSP nonce, security headers (section 4)
│   ├── app/
│   │   ├── layout.tsx                   # html/body, fonts, <Providers>, <Toaster>
│   │   ├── page.tsx                     # "/" -> redirect: staff home by role or /login
│   │   ├── not-found.tsx, error.tsx, forbidden/page.tsx
│   │   ├── (public)/login/page.tsx
│   │   ├── (public)/public/queue/page.tsx
│   │   ├── (public)/public/queue/[queueSessionId]/page.tsx
│   │   └── (staff)/
│   │       ├── layout.tsx               # <RequireAuth> + AppShell (sidebar, header, idle timer)
│   │       ├── change-password/page.tsx
│   │       ├── doctor/dashboard/page.tsx
│   │       ├── doctor/patients/search/page.tsx
│   │       ├── doctor/patients/new/page.tsx
│   │       ├── doctor/patients/[patientId]/page.tsx
│   │       ├── doctor/consultations/new/page.tsx
│   │       ├── doctor/consultations/[consultationId]/page.tsx
│   │       ├── doctor/prescriptions/page.tsx
│   │       ├── pharmacist/dashboard/page.tsx
│   │       ├── pharmacist/prescriptions/page.tsx
│   │       ├── pharmacist/prescriptions/[prescriptionId]/page.tsx
│   │       ├── medicines/page.tsx
│   │       ├── bookings/new/page.tsx
│   │       ├── queue/page.tsx
│   │       ├── queue/[queueSessionId]/page.tsx
│   │       └── admin/{users/page.tsx, users/[userId]/page.tsx, audit-events/page.tsx}
│   ├── components/ui/                   # shadcn/ui generated components (button, input, dialog, table, badge, ...)
│   ├── components/                      # app-wide: AppShell, PageHeader, StatusBadge, DataTable, EmptyState, ErrorPanel,
│   │                                    # LoadingSkeleton, ConfirmDialog, QueueNumber, RoleGate (UX only)
│   ├── features/
│   │   ├── auth/        (AuthProvider, useAuth, LoginForm, ChangePasswordForm, useIdleLogout, RequireAuth)
│   │   ├── patients/    (PatientSearch, PatientForm, PatientSummaryCard, EditPatientDialog, queries.ts)
│   │   ├── history/     (MedicalHistory, ConsultationCard, PrescriptionCard, ConditionsList)
│   │   ├── consultations/ (ConsultationForm, DiagnosesField, PrescriptionEditor, MedicineCombobox, ConsultationDetail)
│   │   ├── pharmacy/    (PrescriptionQueue, PrescriptionDetail, DispenseDialog, CancelPrescriptionDialog)
│   │   ├── medicines/   (MedicineTable, MedicineFormDialog)
│   │   ├── queue/       (SessionList, CreateSessionDialog, QueueConsole, CallNextButton, EntryTable, BookingForm, QueueWidget)
│   │   ├── public-queue/ (PublicSessionList, PublicQueueDisplay, MyPositionHelper)
│   │   └── admin/       (UserTable, UserFormDialog, ResetPasswordDialog, AuditTable)
│   ├── lib/
│   │   ├── api/         (schema.d.ts [generated], client.ts, problem.ts, error-messages.ts, endpoints.ts, idempotency.ts, query-keys.ts)
│   │   ├── auth/        (token-store.ts, roles.ts)
│   │   ├── validation/  (zod schemas mirroring openapi.yaml)
│   │   ├── format.ts    (dates, ages, RX numbers, quantities)
│   │   └── env.ts       (typed, validated public env)
│   └── messages/en.ts   # all user-visible strings (NFR-030)
├── tests/ (vitest setup, MSW handlers)  e2e/ (Playwright)
└── public/
```

## 2. Technology and versions

| Package | Version | Use |
|---|---|---|
| next | 16.x (latest patch), App Router, `output: 'standalone'` | framework |
| react / react-dom | 19.x | |
| typescript | 5.x, `strict: true`, `noUncheckedIndexedAccess: true` | |
| tailwindcss | 4.x (`@tailwindcss/postcss`) | styling |
| shadcn/ui (CLI `shadcn`) | latest; components copied into `src/components/ui` | Button, Input, Textarea, Select, Combobox (Command + Popover), Dialog, AlertDialog, Table, Tabs, Badge, Card, Sheet, Skeleton, Sonner (toasts), Form, Label, Tooltip, Pagination |
| react-hook-form + @hookform/resolvers | 7.x / latest | forms |
| zod | 4.x | validation |
| @tanstack/react-query (+ devtools in dev) | 5.x | server state |
| openapi-typescript | 7.x | generates `src/lib/api/schema.d.ts` from `docs/openapi.yaml` |
| lucide-react | latest | icons |
| vitest, @testing-library/react, @testing-library/user-event, jsdom, msw | latest | unit/component/integration tests |
| @playwright/test, @axe-core/playwright | latest | e2e and accessibility |
| eslint 9 (flat config: `eslint-config-next`, `typescript-eslint`, `eslint-plugin-jsx-a11y`, `eslint-plugin-security`) + prettier | latest | lint/format |

Use the npm package manager (`package-lock.json` committed). Node.js 22 LTS.

## 3. Configuration and environment

### 3.1 Environment variables


| Variable | Component | Required | Secret | Default | Local dev value | Description |
|---|---|---|---|---|---|---|
| `API_PROXY_TARGET` | frontend | yes | no | - | `http://localhost:8080` | Server-side only (NOT NEXT_PUBLIC). Origin the Next.js rewrite forwards /api/* to, e.g. http://backend:8080 inside Docker Compose. |
| `NEXT_PUBLIC_API_BASE_PATH` | frontend | no | no | `/api/v1` | `/api/v1` | Path prefix used by the browser API client. Relative so the browser always calls the same origin. |
| `NEXT_PUBLIC_APP_NAME` | frontend | no | no | `Dispensary Management System` | `DMS (dev)` | Name shown in the header and page titles. |
| `NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS` | frontend | no | no | `5000` | `5000` | Polling interval for public and staff queue views (min 2000). |
| `NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS` | frontend | no | no | `10000` | `10000` | Polling interval for the pharmacist prescription queue and doctor status views (min 5000). |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` | frontend | no | no | `30` | `30` | Staff session is logged out after this many minutes without keyboard/mouse/touch activity. |



- `NEXT_PUBLIC_*` values are inlined at **build** time (Docker build args, see compose). They contain no secrets.
- `API_PROXY_TARGET` is read at **runtime** by `src/proxy.ts` only; never import it into client code.
- `src/lib/env.ts` validates public env with Zod at startup (numbers >= the documented minimums) and exports typed constants.
- `.env.local` for `npm run dev` (from the root `.env.example`): `API_PROXY_TARGET=http://localhost:8080`.

### 3.2 `next.config.ts`

```ts
import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
};
export default config;
```

Do **not** use `rewrites()` for the API: they are resolved at build time; forwarding is done at runtime in `proxy.ts`.

### 3.3 `frontend/Dockerfile`

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_PATH NEXT_PUBLIC_APP_NAME NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S dms && adduser -S dms -G dms
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER dms
EXPOSE 3000
CMD ["node", "server.js"]
```

The `docker-compose.yml` at the repository root (backend-requirements.md section 5.2) builds this image and sets `API_PROXY_TARGET=http://backend:8080`.

## 4. Runtime proxy, security headers and CSP

`src/proxy.ts` (Next.js 16 "proxy", formerly middleware) runs for every request:

1. **API forwarding:** requests to `/api/:path*` are rewritten to `${API_PROXY_TARGET}/api/:path*` with `NextResponse.rewrite(new URL(...))`, preserving method, headers, body,
   query and `Set-Cookie`. This keeps the browser same-origin (no CORS; the `SameSite=Strict` refresh cookie works). If `API_PROXY_TARGET` is unset in production behind the
   reverse proxy, the reverse proxy routes `/api` itself and this branch is never hit.
2. **CSP with nonce** for page requests: generate a random nonce per request and set
   `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
   (pass the nonce via the `x-nonce` request header; App Router applies it to its scripts). In development add `'unsafe-eval'` to `script-src` only.
3. **Security headers** on all responses: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
   `X-Frame-Options: DENY`; staff pages additionally `Cache-Control: no-store`.
4. `proxy.ts` does **not** decide authorisation (it cannot see the in-memory access token); it may redirect `/` only.

Matcher: everything except `_next/static`, `_next/image` and `favicon.ico`.

## 5. API client

### 5.1 Generated types

```bash
npm run gen:api   # = openapi-typescript ../docs/openapi.yaml -o src/lib/api/schema.d.ts
```

Commit the generated file; CI runs `npm run gen:api && git diff --exit-code src/lib/api/schema.d.ts` (NFR-022). Use
`components['schemas']['PatientResponse']` etc.; export friendly aliases in `src/lib/api/types.ts` (`export type PatientResponse = components['schemas']['PatientResponse']`).

### 5.2 `client.ts` - requirements

- `apiFetch<T>(method, path, { query, body, headers, idempotencyKey, ifNoneMatch, signal })` where `path` is a contract path with parameters substituted
  (helper `buildPath('/patients/{patientId}', { patientId })` - encode with `encodeURIComponent`). Base = `NEXT_PUBLIC_API_BASE_PATH` (relative, `/api/v1`).
- Always send `Accept: application/json`; `Content-Type: application/json` when a body exists; `X-Request-Id` = `crypto.randomUUID()`.
- Adds `Authorization: Bearer <token>` from the in-memory token store for non-public calls.
- Repeatable query params use `?status=A&status=B`. Omit undefined/null query values.
- `idempotencyKey` -> `Idempotency-Key` header. `ifNoneMatch` -> `If-None-Match`; on 304 return `{ notModified: true }` and keep cached data.
- Responses: 2xx JSON -> typed data (204 -> `undefined`); store `ETag` header for the caller when present.
- Errors: `application/problem+json` -> throw `ApiError` (`status`, `code`, `title`, `detail`, `errors[]`, context fields, `requestId`). Network failure -> `ApiError` with `code = 'NETWORK_ERROR'` (client-only code).
- **401 handling:** if `code` is `TOKEN_EXPIRED` (or `UNAUTHENTICATED` while a token exists), call `refreshSession()` once (single-flight: concurrent callers await the same promise), then retry the
  original request once. Refresh `401 REFRESH_TOKEN_ROTATED` -> wait 500 ms and refresh once more. Any other refresh failure -> clear session, `queryClient.clear()`, redirect to `/login?next=<current path>&reason=expired`.
- `403 PASSWORD_CHANGE_REQUIRED` -> redirect to `/change-password`. `403 FORBIDDEN` -> render `<ErrorPanel>` "You do not have permission" (no redirect loop).
- Mutations are never retried automatically (EH-09).

### 5.3 `endpoints.ts` - one typed function per operation

Function name = operationId. Query functions are used with `useQuery`, mutations with `useMutation`. After a successful mutation invalidate exactly the listed keys.


| Function (= operationId) | Endpoint (under /api/v1) | Request type | Response type | Kind | Query key / invalidates after success | Polling | Idempotency-Key |
|---|---|---|---|---|---|---|---|
| `login` | POST `/auth/login` | LoginRequest | TokenResponse | mutation | set ['me'] from response | - | - |
| `refreshToken` | POST `/auth/refresh` | - | TokenResponse | mutation | - | - | - |
| `logout` | POST `/auth/logout` | - | (empty) | mutation | queryClient.clear() | - | - |
| `getCurrentUser` | GET `/auth/me` | - | CurrentUser | query | `['me']` | - | - |
| `changePassword` | POST `/auth/change-password` | ChangePasswordRequest | (empty) | mutation | ['me'] | - | - |
| `listUsers` | GET `/users` | - | UserPage | query | `['users', 'list', filters]` | - | - |
| `createUser` | POST `/users` | CreateUserRequest | UserResponse | mutation | ['users'], ['staff'] | - | - |
| `getUser` | GET `/users/{userId}` | - | UserResponse | query | `['users', userId]` | - | - |
| `updateUser` | PUT `/users/{userId}` | UpdateUserRequest | UserResponse | mutation | ['users'], ['staff'] | - | - |
| `resetUserPassword` | POST `/users/{userId}/reset-password` | ResetPasswordRequest | (empty) | mutation | ['users', userId] | - | - |
| `listStaff` | GET `/staff` | - | StaffList | query | `['staff', role]` | - | - |
| `searchPatients` | GET `/patients` | - | PatientSummaryPage | query | `['patients', 'search', {search, page, size}]` | - | - |
| `createPatient` | POST `/patients` | CreatePatientRequest | PatientResponse | mutation | ['patients', 'search']; seed ['patients', id] | - | yes |
| `getPatientByNumber` | GET `/patients/by-number/{patientNumber}` | - | PatientResponse | query | `['patients', 'by-number', patientNumber]` | - | - |
| `getPatient` | GET `/patients/{patientId}` | - | PatientResponse | query | `['patients', patientId]` | - | - |
| `updatePatient` | PUT `/patients/{patientId}` | UpdatePatientRequest | PatientResponse | mutation | ['patients', patientId], ['patients', patientId, 'history'] | - | - |
| `getMedicalHistory` | GET `/patients/{patientId}/medical-history` | - | MedicalHistoryResponse | query | `['patients', patientId, 'history', {page, size}]` | - | - |
| `createConsultation` | POST `/consultations` | CreateConsultationRequest | ConsultationResponse | mutation | ['patients', patientId, 'history'], ['prescriptions', 'list']; seed ['consultations', id] | - | yes |
| `getConsultation` | GET `/consultations/{consultationId}` | - | ConsultationResponse | query | `['consultations', consultationId]` | NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS (only while a prescription is PENDING/IN_PROGRESS) | - |
| `addPrescriptionToConsultation` | POST `/consultations/{consultationId}/prescriptions` | AddPrescriptionRequest | PrescriptionResponse | mutation | ['consultations', consultationId], ['patients', patientId, 'history'], ['prescriptions', 'list'] | - | yes |
| `listPrescriptions` | GET `/prescriptions` | - | PrescriptionSummaryPage | query | `['prescriptions', 'list', filters]` | NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS | - |
| `getPrescription` | GET `/prescriptions/{prescriptionId}` | - | PrescriptionResponse | query | `['prescriptions', prescriptionId]` | - | - |
| `startPrescription` | POST `/prescriptions/{prescriptionId}/start` | - | PrescriptionResponse | mutation | ['prescriptions', prescriptionId], ['prescriptions', 'list'] | - | - |
| `dispensePrescription` | POST `/prescriptions/{prescriptionId}/dispense` | DispenseRequest | PrescriptionResponse | mutation | ['prescriptions', prescriptionId], ['prescriptions', 'list'] | - | yes |
| `cancelPrescription` | POST `/prescriptions/{prescriptionId}/cancel` | CancelPrescriptionRequest | PrescriptionResponse | mutation | ['prescriptions', prescriptionId], ['prescriptions', 'list'], ['consultations', consultationId], ['patients', patientId, 'history'] | - | - |
| `listMedicines` | GET `/medicines` | - | MedicinePage | query | `['medicines', 'list', filters]` | - | - |
| `createMedicine` | POST `/medicines` | CreateMedicineRequest | MedicineResponse | mutation | ['medicines'] | - | - |
| `getMedicine` | GET `/medicines/{medicineId}` | - | MedicineResponse | query | `['medicines', medicineId]` | - | - |
| `updateMedicine` | PUT `/medicines/{medicineId}` | UpdateMedicineRequest | MedicineResponse | mutation | ['medicines'] | - | - |
| `listQueueSessions` | GET `/queue-sessions` | - | QueueSessionPage | query | `['queue-sessions', 'list', {date, status}]` | NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS | - |
| `createQueueSession` | POST `/queue-sessions` | CreateQueueSessionRequest | QueueSessionResponse | mutation | ['queue-sessions', 'list'] | - | - |
| `getQueueSession` | GET `/queue-sessions/{queueSessionId}` | - | QueueSessionResponse | query | `['queue-sessions', queueSessionId]` | NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS | - |
| `openQueueSession` | POST `/queue-sessions/{queueSessionId}/open` | - | QueueSessionResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `closeQueueSession` | POST `/queue-sessions/{queueSessionId}/close` | CloseQueueSessionRequest | QueueSessionResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `listQueueEntries` | GET `/queue-sessions/{queueSessionId}/entries` | - | QueueEntryPage | query | `['queue-sessions', queueSessionId, 'entries', filters]` | NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS | - |
| `createBooking` | POST `/queue-sessions/{queueSessionId}/entries` | CreateBookingRequest | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | yes |
| `callNextPatient` | POST `/queue-sessions/{queueSessionId}/call-next` | CallNextRequest | CallNextResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list']; setQueryData(['queue-sessions', id], response.session) | - | - |
| `getQueueEntry` | GET `/queue-entries/{queueEntryId}` | - | QueueEntryResponse | query | `['queue-entries', queueEntryId]` | - | - |
| `callQueueEntry` | POST `/queue-entries/{queueEntryId}/call` | - | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `completeQueueEntry` | POST `/queue-entries/{queueEntryId}/complete` | - | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `skipQueueEntry` | POST `/queue-entries/{queueEntryId}/skip` | SkipQueueEntryRequest | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `requeueQueueEntry` | POST `/queue-entries/{queueEntryId}/requeue` | - | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `cancelBooking` | POST `/queue-entries/{queueEntryId}/cancel` | CancelBookingRequest | QueueEntryResponse | mutation | ['queue-sessions', queueSessionId], ['queue-sessions', queueSessionId, 'entries'], ['queue-sessions', 'list'] | - | - |
| `listPublicQueueSessions` | GET `/public/queue-sessions` | - | PublicQueueSessionList | query | `['public', 'queue-sessions']` | NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS | - |
| `getPublicQueueStatus` | GET `/public/queue-sessions/{queueSessionId}` | - | PublicQueueStatus | query | `['public', 'queue-sessions', queueSessionId]` | NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS | - |
| `listAuditEvents` | GET `/audit-events` | - | AuditEventPage | query | `['audit-events', filters]` | - | - |



### 5.4 Idempotency keys (`idempotency.ts`)

- Hook `useIdempotencyKey()` returns `{ key, renew }`. The key is created with `crypto.randomUUID()` when the form/dialog **opens**; it is reused for every retry of the same
  submission; `renew()` is called after a **successful** submission or when the user changes the form after an error that is not a network error/5xx.
- `createBooking` after `409 DUPLICATE_BOOKING`: the confirmation re-submits with `allowDuplicate: true` **and a new key** (the body changed).
- Never store keys outside component state.

### 5.5 Problem handling (`problem.ts`, `error-messages.ts`)

- `toUserMessage(err)`: screen-specific override, else `errorMessages[err.code]`, else `detail`, else generic text. Always show `requestId` for 500/503 in the `ErrorPanel` ("Reference: ...").
- `applyFieldErrors(form, err)`: maps `errors[].field` (JSON paths like `prescription.items[2].quantity`) to React Hook Form paths (`prescription.items.2.quantity`) with `setError`; unmatched fields go to a form-level alert.

```ts
// src/lib/api/error-messages.ts - GENERATED from the ErrorCode catalogue; keep in sync with openapi.yaml
import type { components } from './schema';

export type ErrorCode = components['schemas']['ErrorCode'];

export const errorMessages: Record<ErrorCode, string> = {
  MALFORMED_REQUEST: 'Malformed request',
  VALIDATION_FAILED: 'Validation failed',
  IDEMPOTENCY_KEY_REQUIRED: 'Idempotency key required',
  UNAUTHENTICATED: 'Authentication required',
  TOKEN_EXPIRED: 'Access token expired',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_LOCKED: 'Account temporarily locked',
  ACCOUNT_DISABLED: 'Account disabled',
  REFRESH_TOKEN_INVALID: 'Session expired',
  REFRESH_TOKEN_ROTATED: 'Refresh token already rotated',
  SESSION_REVOKED: 'Session revoked',
  FORBIDDEN: 'Access denied',
  PASSWORD_CHANGE_REQUIRED: 'Password change required',
  NOT_RESOURCE_OWNER: 'Not the owner of this resource',
  RESOURCE_NOT_FOUND: 'Resource not found',
  PATIENT_NOT_FOUND: 'Patient not found',
  CONSULTATION_NOT_FOUND: 'Consultation not found',
  PRESCRIPTION_NOT_FOUND: 'Prescription not found',
  QUEUE_SESSION_NOT_FOUND: 'Queue session not found',
  QUEUE_ENTRY_NOT_FOUND: 'Queue entry not found',
  USER_NOT_FOUND: 'User not found',
  MEDICINE_NOT_FOUND: 'Medicine not found',
  DUPLICATE_PATIENT_NUMBER: 'Patient number already exists',
  DUPLICATE_USERNAME: 'Username already exists',
  DUPLICATE_MEDICINE: 'Medicine already exists',
  DUPLICATE_QUEUE_SESSION: 'Queue session already exists',
  DUPLICATE_BOOKING: 'Possible duplicate booking',
  CONCURRENT_MODIFICATION: 'Record changed by someone else',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  QUEUE_STATE_CHANGED: 'Queue changed',
  QUEUE_SESSION_NOT_OPEN: 'Queue session not open',
  QUEUE_SESSION_CLOSED: 'Queue session closed',
  QUEUE_SESSION_FULL: 'Queue session full',
  QUEUE_SESSION_HAS_ACTIVE_ENTRIES: 'Queue session has active entries',
  QUEUE_ENTRY_ALREADY_LINKED: 'Queue entry already linked',
  ACTIVE_PRESCRIPTION_EXISTS: 'Active prescription exists',
  REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource not found',
  MEDICINE_INACTIVE: 'Medicine is not available',
  CONSULTATION_LOCKED: 'Consultation locked',
  INVALID_SUPERSEDED_PRESCRIPTION: 'Invalid superseded prescription',
  QUEUE_ENTRY_NOT_IN_SESSION: 'Queue entry not in session',
  DISPENSE_ITEMS_MISMATCH: 'Dispense items do not match',
  DISPENSE_QUANTITY_EXCEEDS_PRESCRIBED: 'Quantity exceeds prescribed',
  NOTHING_DISPENSED: 'Nothing dispensed',
  DISPENSE_NOTE_REQUIRED: 'Note required',
  INVALID_SESSION_DATE: 'Invalid session date',
  ASSIGNED_USER_NOT_DOCTOR: 'Assigned user is not a doctor',
  SELF_MODIFICATION_NOT_ALLOWED: 'Cannot change own account this way',
  LAST_ADMIN_REQUIRED: 'At least one admin required',
  CURRENT_PASSWORD_INCORRECT: 'Current password incorrect',
  PASSWORD_POLICY_VIOLATION: 'Password does not meet policy',
  IDEMPOTENCY_KEY_REUSED: 'Idempotency key reused',
  RATE_LIMITED: 'Too many requests',
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
};
```


## 6. Authentication, session handling and route protection

- **Token store** (`lib/auth/token-store.ts`): module-level variable holding `{ accessToken, expiresAt, user }`; never written to localStorage, sessionStorage, IndexedDB or cookies.
- **AuthProvider** (client component at the root): on mount calls `refreshToken` (`POST /auth/refresh`, `credentials: 'same-origin'`, header `X-Requested-With: XMLHttpRequest`);
  success -> store token + user, status `authenticated`; 401 -> status `anonymous`. Exposes `useAuth()` = `{ status, user, roles, login, logout, hasRole }`.
  Proactively refreshes 60 s before `expiresAt` while the tab is visible.
- **Login** (`login`): on success store the token; if `user.mustChangePassword` -> `/change-password`; else `next` param (only if it is a same-origin path starting with `/` and not `//`) or the role home:
  DOCTOR -> `/doctor/dashboard`, else PHARMACIST -> `/pharmacist/dashboard`, else ADMIN -> `/admin/users`.
- **RequireAuth** (in `(staff)/layout.tsx`): while `status === 'loading'` render a full-page skeleton (no protected content, no data fetching); `anonymous` -> `router.replace('/login?next=...')`;
  `mustChangePassword` and not on `/change-password` -> redirect there. Each page declares `requiredRoles` (table in section 10); if the user has none of them render `/forbidden` content.
  These guards are UX only; the API enforces access.
- **RoleGate** hides actions the user cannot perform (e.g. "Call next" for pharmacists) - for usability, never as the security control.
- **Logout:** `POST /auth/logout`, clear token store, `queryClient.clear()`, `router.replace('/login')`.
- **Idle logout** (`useIdleLogout`): listens to `pointerdown`, `keydown`, `wheel`, `touchstart` (throttled); after `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` without activity -> logout with
  `/login?reason=idle`. A warning dialog appears 60 s before ("You will be signed out in 60 s - Stay signed in"). Background polling does not reset the timer.
- **Multiple tabs:** each tab bootstraps via refresh; the cookie is shared, so the `REFRESH_TOKEN_ROTATED` retry rule (5.2) handles races. Use a `BroadcastChannel('dms-auth')` to propagate logout to other tabs.

## 7. Server state with TanStack Query

- One `QueryClient` per browser session created in `Providers` (`useState(() => new QueryClient(...))`). Defaults: `staleTime: 0` for queue/prescription queries, `30_000` for medicines and staff;
  `gcTime: 5 * 60_000`; `retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2`; `refetchOnWindowFocus: true`; mutations `retry: 0`.
- Query keys exactly as in 5.3 (`lib/api/query-keys.ts` exports factory functions). Invalidate by prefix after mutations as listed.
- **Polling** (`refetchInterval`): queue session, entries and public views every `NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS` (default 5000); prescription list every
  `NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS` (10000); consultation detail every 10000 **only while** any prescription is PENDING or IN_PROGRESS.
  `refetchIntervalInBackground: false` except on `/public/queue/[id]` (TV displays). Use `If-None-Match` with the last ETag; on 304 keep data and update "last updated".
- Never put query data into global stores; never persist the cache (`persistQueryClient` is forbidden).
- After `callNextPatient` set the session cache from `response.session` immediately (no flicker) and invalidate the entries list.

## 8. Forms and validation

React Hook Form + `zodResolver`. Zod schemas in `src/lib/validation/` mirror `openapi.yaml` constraints exactly (lengths equal the database columns). Trim strings
with `z.string().trim()`; optional text fields convert `''` to `null` before submit. Field errors render under the field (`aria-describedby`), and the first invalid field receives focus on submit.

```ts
// src/lib/validation/schemas.ts (excerpt - implement all schemas used by the screens)
export const patientNumber = z.string().trim().toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,19}$/, 'Use 3-20 letters, digits or hyphens');
export const phone = z.string().trim().transform(v => v.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'Enter 7-15 digits, optionally starting with +'));
const optionalText = (max: number) => z.string().trim().max(max).transform(v => (v === '' ? null : v)).nullable();

export const createPatientSchema = z.object({
  patientNumber,
  fullName: z.string().trim().min(1).max(150),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
  dobMode: z.enum(['exact', 'estimated']),                       // UI-only discriminator, not sent
  dateOfBirth: z.string().optional(),                            // yyyy-mm-dd, >= 1900-01-01, <= today (dispensary date)
  estimatedAgeYears: z.coerce.number().int().min(0).max(130).optional(),
  phoneNumber: phone.or(z.literal('')).optional(),
  address: optionalText(300),
  knownAllergies: optionalText(1000),
}).superRefine(/* exactly one of dateOfBirth / estimatedAgeYears according to dobMode; date range */);

export const prescriptionItemSchema = z.object({
  source: z.enum(['catalogue', 'free']),                         // UI-only
  medicineId: z.uuid().optional(),
  medicineName: z.string().trim().min(1).max(200).optional(),
  strength: optionalText(50), dosageForm: z.enum(DOSAGE_FORMS).nullable().optional(),
  dose: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  durationDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
  quantity: z.string().trim().regex(/^\d{1,5}(\.\d{1,2})?$/, 'Up to 5 digits and 2 decimals').refine(v => Number(v) > 0, 'Must be greater than 0'),
  quantityUnit: z.string().trim().min(1).max(30),
  instructions: optionalText(500),
}).superRefine(/* catalogue -> medicineId required and name/strength/form NOT sent; free -> medicineName required */);

export const consultationSchema = z.object({
  presentingComplaint: optionalText(1000),
  clinicalNotes: optionalText(5000),
  diagnoses: z.array(z.object({ conditionText: z.string().trim().min(1).max(500),
    icd10Code: z.string().trim().toUpperCase().regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/).or(z.literal('')).optional() })).min(1).max(10),
  prescription: z.object({ notes: optionalText(1000), items: z.array(prescriptionItemSchema).min(1).max(30) }).nullable(),
});
export const cancelReasonSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const bookingSchema = z.object({ patientName: z.string().trim().min(1).max(150), contactPhone: phone.or(z.literal('')).optional(),
  channel: z.enum(['PHONE', 'WALK_IN']), notes: optionalText(300) });
export const queueSessionSchema = z.object({ sessionDate: z.string() /* today..today+30 */, name: z.string().trim().min(1).max(100), assignedDoctorId: z.uuid().nullable() });
export const passwordSchema = z.string().min(12).max(128);
```

Quantities are kept as strings in inputs (`inputMode="decimal"`), validated with `/^\d{1,5}(\.\d{1,2})?$/` and `> 0` (dispensed quantities `>= 0`), and
converted with `Number(value)` only when building the request body. Comparisons (dispensed vs prescribed) use integer hundredths (`Math.round(Number(v) * 100)`)
to avoid floating-point errors. Date inputs use the browser's local date for client-side range hints; the backend (dispensary time zone) is authoritative and
returns 400/422 when a date is out of range.

The request payloads must equal the contract shapes: map UI-only fields (`dobMode`, `source`) away before sending; for catalogue items send only `medicineId` + dose fields.

## 9. Design system and UX conventions

- **Look:** clean clinical dashboard - white/very light grey surfaces, one accent colour (teal-blue `#1F5F8B`), Inter (via `next/font/local` or system stack), base size 16 px, line height 1.5,
  minimum 14 px for secondary text; tabular numbers for queue numbers and quantities. Tailwind theme tokens in `globals.css` (`--primary`, `--destructive`, `--warning`, `--success`).
- **Layout:** staff `AppShell` = left sidebar (collapsible to a sheet below 1024 px) with role-filtered navigation, top bar with app name, today's date, current user name + roles and *Sign out*.
  Content max width 1280 px; pages start with `PageHeader` (title, breadcrumb, primary action).
- **Navigation by role:** DOCTOR - Dashboard, Patients, My prescriptions, Queue, New booking; PHARMACIST - Dashboard, Prescriptions, Queue, New booking, Medicines; ADMIN - Users, Audit log, Medicines.
  Users with several roles see the union, grouped.
- **Status badges** (`StatusBadge`) always show text plus colour: PENDING (amber), IN_PROGRESS (blue), DISPENSED (green; "Dispensed - partial" when outcome PARTIAL, green outline), CANCELLED (grey, strikethrough icon);
  queue WAITING (grey), SERVING (blue, pulsing dot respecting `prefers-reduced-motion`), COMPLETED (green), SKIPPED (amber), CANCELLED (grey); session SCHEDULED/OPEN/CLOSED.
- **Feedback:** success toasts (Sonner) for completed mutations; inline field errors; `ErrorPanel` with retry for failed queries; `ConfirmDialog` (AlertDialog) for irreversible actions
  (dispense, cancel prescription, cancel booking, skip, force close, disable user). Buttons show a spinner and are disabled while pending (prevents double submits).
- **Loading:** skeletons matching the final layout; never blank screens. **Empty states:** icon + one sentence + primary action.
- **Accessibility (WCAG 2.2 AA):** semantic landmarks; every input has a visible label; keyboard-operable comboboxes and dialogs (focus trap, Esc closes, focus returns); visible focus ring;
  contrast >= 4.5:1; queue changes announced with `aria-live="polite"`; tables have header cells and captions; no information by colour only; target size >= 24 px.
- **Responsive:** 360-767 px single column, tables become stacked cards; 768-1279 px; >= 1280 px full layout; public display optimised for 1920x1080 at 5 m (now-serving digits >= 160 px).
- **Formatting (`lib/format.ts`):** dates `12 Oct 2026`, date-times `12 Oct 2026, 10:15` in the browser's time zone; ages `48 y` / `~70 y (estimated)`; quantities without trailing zeros (`7.5 tablets`);
  `RX-000123` as received.
- **Text:** all strings in `src/messages/en.ts`.

## 10. Screens

Each screen lists purpose, layout, components, actions, API calls (operationIds), validation, states and authorisation. "Roles" are the page's `requiredRoles`.

### 10.1 Login - `/login` (public)

- **Purpose:** staff sign-in. **Layout:** centred card (max 400 px) with app name, username, password, *Sign in*; message area for `reason=expired|idle`.
- **Actions/API:** `login`; already authenticated -> redirect to role home.
- **Validation:** username 1-50, password 1-128 (required). **Loading:** button spinner, inputs disabled. **Error:** INVALID_CREDENTIALS -> "Username or password is incorrect" (form-level);
  ACCOUNT_LOCKED -> "Account locked until 10:15" (from `lockedUntil`); ACCOUNT_DISABLED; RATE_LIMITED -> "Too many attempts, wait N s". Password field cleared after failure. **Success:** redirect (section 6).

### 10.2 Change password - `/change-password` (any staff)

Forced after first login/reset (no navigation available until done) and reachable from the user menu. Fields current, new, confirm (client: new 12-128, equals confirm). API `changePassword`
then `getCurrentUser`; errors CURRENT_PASSWORD_INCORRECT, PASSWORD_POLICY_VIOLATION mapped to fields. Success toast and redirect to role home.

### 10.3 Doctor dashboard - `/doctor/dashboard` (DOCTOR)

- **Purpose:** the doctor's start page during a clinic.
- **Layout:** three cards: (1) **Queue widget** - session selector (today's sessions, defaulting to the one assigned to the doctor or the last used, remembered in component state only),
  large "Now serving" number, next waiting number, counts (waiting/serving/completed/skipped), serving entry's caller name, buttons **Complete & call next** (primary) / **Call next**,
  **Skip (not present)**, **Complete**, link "Open console"; (2) **Find patient** - patient-number input + *Open*; (3) **My recent prescriptions** - last 10 with status badges.
- **API:** `listQueueSessions` (today), `getQueueSession` (poll 5 s, ETag), `callNextPatient`, `completeQueueEntry`, `skipQueueEntry`, `getPatientByNumber`, `listPrescriptions` (`sort=submittedAt,desc`, size 10, poll 10 s).
- **Call next behaviour:** sends `expectedLastCalledNumber = session.currentServingNumber` from the latest data and `completeCurrentEntryId` = the serving entry the doctor called (if any);
  button disabled while pending; on `409 QUEUE_STATE_CHANGED` toast "Queue moved on - now serving N", refetch, **no automatic retry**; on `calledEntry: null` show "No patients waiting".
  Session not OPEN -> buttons disabled with hint "Open the session in Queue".
- **States:** loading skeletons; empty: "No queue session today - create one in Queue"; errors in-card with retry.
- **Success:** the new number animates; toast "Calling number 7". *Start consultation* on the serving entry opens `/doctor/patients/search?queueEntryId=<id>`; the `queueEntryId` query parameter is carried through the history page (or registration) to `/doctor/consultations/new?patientId=...&queueEntryId=...`.

### 10.4 Patient ID search - `/doctor/patients/search` (DOCTOR)

- **Layout:** large patient-number field with *Search*; below, an "Other search" input (name/phone, 2-100 chars) with results table (number, name, sex, age, phone).
- **API:** `getPatientByNumber` on submit; `searchPatients` (debounced 300 ms, min 2 chars, paginated 20).
- **Flows:** found -> navigate to `/doctor/patients/[id]` (keeping `?queueEntryId=` if present); `404 PATIENT_NOT_FOUND` -> inline result card "No patient with number P-0099" + **Register new patient** (link to `/doctor/patients/new?patientNumber=P-0099`, carrying `queueEntryId` if present).
- **Validation:** number pattern (normalised to upper case as you type). **Empty:** "No matches". **Errors:** ErrorPanel.

### 10.5 New patient registration - `/doctor/patients/new` (DOCTOR)

- **Layout:** form card: patient number (pre-filled), full name, sex (radio group), date-of-birth mode toggle (**Exact date** / **Age only (DOB unknown)**) with a date input or an age input,
  phone, address, known allergies (textarea, highlighted). A side panel "Possible existing patients" runs `searchPatients` on the name (>= 3 chars, debounced) (BR-PAT-05).
- **API:** `createPatient` with Idempotency-Key; on success navigate to `/doctor/consultations/new?patientId=<id>[&queueEntryId=]` (Workflow B) with toast "Patient registered".
- **Errors:** `409 DUPLICATE_PATIENT_NUMBER` -> field error on patient number + link "Open existing patient" (`existingPatientId`); field errors from `errors[]`.

### 10.6 Patient medical history - `/doctor/patients/[patientId]` (DOCTOR)

- **Layout:** header card (name, number, sex, age/estimated, phone, address) with **Known allergies** in a prominent warning box (or "No known allergies recorded"); actions **New consultation** (passes `patientId` and any `queueEntryId` from the URL), **Edit details**.
  Section "Previous conditions" (chips: condition, ICD-10, last recorded date, count). Section "Consultations" - timeline of cards, newest first, each with date/time, doctor, complaint,
  notes (collapsed after 3 lines), diagnoses, and each prescription: RX number, status badge, items table (medicine, strength, form, dose, frequency, duration, quantity, instructions)
  and - when dispensed - dispensed quantity and item status per line, pharmacist and time, notes. Cancelled prescriptions show the reason and "Replaced by RX-..." link if superseded.
  Pagination "Load older consultations" (page size 10).
- **API:** `getMedicalHistory` (page 0.., `size=10`); `updatePatient` from the **Edit details** dialog (sends `version`; DOB mode as in registration; on `409 CONCURRENT_MODIFICATION` reload and show "Someone else changed this patient").
- **Empty:** "No consultations yet" + New consultation. **Errors:** 404 -> "Patient not found" page.

### 10.7 New consultation with prescription editor - `/doctor/consultations/new?patientId=&queueEntryId=` (DOCTOR)

- **Layout:** two columns >= 1280 px: left = form, right = sticky patient summary (allergies prominent) and the last 3 consultations (compact, from `getMedicalHistory` page 0 size 3).
  Form sections: Presenting complaint, Clinical notes, **Diagnoses** (1-10 rows: condition text + optional ICD-10; add/remove; first row is primary),
  **Prescription** (toggle "No medicines - advice only"), **Prescription editor**: rows 1-30, each with a `MedicineCombobox` (search `listMedicines?active=true&search=` debounced 250 ms; option
  "Use '<typed text>' as free-text medicine"), strength and form (read-only when from catalogue, editable for free text), dose, frequency (combobox with presets OD, BD, TDS, QDS, Nocte, Mane, PRN, STAT + free text),
  duration days, quantity + unit (preset units: tablets, capsules, ml, bottles, tubes, sachets, inhalers, drops), instructions; row actions: duplicate, move up/down, remove. A warning (not a block) when the same medicine appears twice.
  Note to pharmacist field.
- **Validation:** schemas of section 8; errors from 422 mapped to item rows (`prescription.items[i].medicineId` etc.).
- **Submit:** *Review & submit* opens a summary dialog (diagnoses, items, patient allergies repeated) -> *Submit consultation* -> `createConsultation` (Idempotency-Key from `useIdempotencyKey`).
  Disabled while pending. On success navigate to `/doctor/consultations/[id]` (toast "Consultation saved - RX-000123 sent to pharmacy"). On network error: keep form, show "Not saved - retry"; retry reuses the key.
- **Leave protection:** `beforeunload` + in-app navigation confirm when the form is dirty. Form state lives only in React state (no browser storage).
- **API:** `getPatient`, `getMedicalHistory`, `getQueueEntry` (if `queueEntryId`, show "Linked to queue number 7"), `listMedicines`, `createConsultation`.

### 10.8 Consultation detail / submission confirmation / dispensing status - `/doctor/consultations/[consultationId]` (DOCTOR)

- **Layout:** confirmation banner after creation ("Saved at 10:12"), patient header, complaint/notes/diagnoses, prescription card with RX number, **live status** (badge + timeline: Submitted -> In progress (by, at) -> Dispensed (by, at, FULL/PARTIAL) or Cancelled (by, at, reason)),
  items with dispensed quantities once available. Actions: **Cancel prescription** (only own consultation and status PENDING/IN_PROGRESS) with reason dialog; **Issue replacement prescription**
  (only when no active prescription, own consultation, within 24 h - otherwise disabled with tooltip) opening the prescription editor in a sheet -> `addPrescriptionToConsultation` with `supersedesPrescriptionId`.
- **API:** `getConsultation` (poll 10 s while PENDING/IN_PROGRESS), `cancelPrescription`, `addPrescriptionToConsultation`, `listMedicines`.
- **Errors:** 409 on cancel (already dispensed) -> toast + refetch; 422 CONSULTATION_LOCKED -> message.

### 10.9 My prescriptions - `/doctor/prescriptions` (DOCTOR)

Table of the doctor's prescriptions (`listPrescriptions` with status filter chips; default all statuses, `sort=submittedAt,desc`, paginated, poll 10 s): RX number, patient (number + name),
submitted, status badge, dispensed at, outcome. Row click -> `/doctor/consultations/[consultationId]` (`consultationId` is part of `PrescriptionSummary`). Empty: "You have not prescribed anything yet".

### 10.10 Pharmacist dashboard - `/pharmacist/dashboard` (PHARMACIST)

Cards: Pending count, In-progress count, oldest pending age ("waiting 14 min"), today's queue sessions summary (now serving / waiting per session); list of the 5 oldest pending with *Open*.
API: `listPrescriptions` (status PENDING / IN_PROGRESS, size 5 and totals from `totalItems`), `listQueueSessions` (today). Poll as in section 7.

### 10.11 Pharmacist prescription queue - `/pharmacist/prescriptions` (PHARMACIST)

- **Layout:** tabs **Pending**, **In progress**, **Dispensed today**, **Cancelled today** (counts in tab labels from `totalItems`); search by patient number or RX number; table: RX number, submitted (relative + exact on hover), patient, doctor, items, status, started by.
  Pending/In progress sorted oldest first; others newest first with `submittedFrom` = start of today.
- **API:** `listPrescriptions` (poll 10 s while visible). New arrivals are highlighted for 10 s and announced (`aria-live`). **Empty:** "No pending prescriptions".

### 10.12 Prescription details and dispensing confirmation - `/pharmacist/prescriptions/[prescriptionId]` (PHARMACIST)

- **Layout:** header with RX number, status, submitted time, prescribing doctor, consultation date; patient panel (name, number, sex, age) with **known allergies** in a warning box; doctor's note; items table
  (medicine, strength, form, dose, frequency, duration, quantity, unit, instructions). Actions: **Start preparing** (PENDING), **Dispense...**, **Cancel prescription**.
- **Dispense dialog:** one row per item with "Prescribed 60 tablets", input "Dispensed" (default = prescribed), quick buttons *Full* / *None*, derived status label (Full / Partial / Not dispensed), note field
  required when below prescribed (placeholder "e.g. out of stock, brand substituted"); overall notes; confirmation checkbox "I have handed these medicines to the patient" required; *Confirm dispensing*.
  All-zero -> inline message "Nothing to dispense - cancel the prescription instead". Sends `dispensePrescription` with Idempotency-Key.
- **After success:** read-only dispensing record (pharmacist, time, outcome, per-item results); toast "RX-000123 dispensed (partial)".
- **Errors:** `409 INVALID_STATUS_TRANSITION` -> "Already DISPENSED by another pharmacist" + refetch; 422 item errors mapped to rows.
- **API:** `getPrescription`, `startPrescription`, `dispensePrescription`, `cancelPrescription`.

### 10.13 Telephone booking registration - `/bookings/new?queueSessionId=` (DOCTOR, PHARMACIST)

- **Layout:** session select (today's and upcoming SCHEDULED/OPEN sessions; default today's first open), caller name, phone (optional), channel (Phone / Walk-in, default Phone), note (hint "No medical information"), *Create booking*.
- **Success:** large result panel "Queue number **6** - Morning OPD - Room 1, 12 Oct" with *New booking* (resets form and key) and *Copy*.
- **Errors:** `409 DUPLICATE_BOOKING` -> confirm dialog "0771234567 already has number 7 in this session. Create another booking?" -> resubmit with `allowDuplicate: true` and a new key;
  QUEUE_SESSION_CLOSED / QUEUE_SESSION_FULL -> form-level error.
- **API:** `listQueueSessions` (today; for upcoming dates the date picker re-queries), `createBooking`.

### 10.14 Queue management dashboard - `/queue` and session console `/queue/[queueSessionId]` (DOCTOR, PHARMACIST)

- **`/queue`:** date picker (today default), session cards (name, status, assigned doctor, now serving, waiting, completed), actions **Create session** (dialog: date today..+30, name, assigned doctor from `listStaff?role=DOCTOR`),
  **Open** (SCHEDULED on its date), **Close** (confirm; if 409 QUEUE_SESSION_HAS_ACTIVE_ENTRIES show counts and offer **Force close** explaining waiting bookings will be cancelled), **Open console**, **Public display link** (copy URL / open in new tab).
  API: `listQueueSessions`, `createQueueSession`, `openQueueSession`, `closeQueueSession`, `listStaff`.
- **Console:** header with now-serving number, next number, counts; doctor-only call controls (same behaviour as 10.3); **New booking** inline dialog; entries table with status filter tabs
  (Waiting, Serving, Done = completed/skipped/cancelled), columns number, name, phone, channel, booked at/by, status, actions per status:
  WAITING -> *Call* (doctor), *Cancel* (reason); SERVING -> *Complete*, *Skip* (doctor); SKIPPED -> *Requeue*. Polls 5 s.
  API: `getQueueSession`, `listQueueEntries`, `callNextPatient`, `callQueueEntry`, `completeQueueEntry`, `skipQueueEntry`, `requeueQueueEntry`, `cancelBooking`, `createBooking`, `openQueueSession`, `closeQueueSession`.
- **Errors:** 409 transitions -> toast + refetch.

### 10.15 Public queue display - `/public/queue` and `/public/queue/[queueSessionId]` (public)

- **`/public/queue`:** list of today's sessions (label, status, now serving, waiting) as large buttons; poll 5 s; empty "No queues today". API `listPublicQueueSessions`.
- **`/public/queue/[id]`:** full-screen, high-contrast layout: session label and date; **NOW SERVING** with the number in very large digits (>= 160 px at 1080p, `clamp()` for phones);
  other serving numbers; "Waiting: 3" and the next waiting numbers (up to 50, wrapped); "Last updated 10:42:05". **My number** helper: numeric input; shows "2 numbers ahead of you" or
  "It's your turn" or "Number not in the waiting list" - computed locally from `waitingNumbers`/`servingNumbers`, never sent or stored.
  Status SCHEDULED -> "This queue has not started yet"; CLOSED -> "This queue is closed".
- **Updates:** poll every 5 s with `If-None-Match`, also in background; announce number changes with `aria-live="polite"`; after 3 consecutive failures show a banner "Connection problem - showing data from 10:41" and keep retrying.
- **Privacy:** the page renders only the `PublicQueueStatus` fields; it imports no staff code, has no auth provider dependency and stores nothing. 404 -> "Queue not found".
- API `getPublicQueueStatus`.

### 10.16 Medicine catalogue - `/medicines` (PHARMACIST, ADMIN)

Table (name, strength, form, active switch) with search and active filter; **Add medicine** / **Edit** dialog (name 1-200, strength <= 50, form select, active); deactivate confirmation explains existing prescriptions are unaffected.
API `listMedicines`, `createMedicine`, `updateMedicine` (with `version`), `getMedicine`. 409 DUPLICATE_MEDICINE -> field error.

### 10.17 Administration - `/admin/users`, `/admin/users/[userId]`, `/admin/audit-events` (ADMIN)

- **Users:** table (name, username, roles, enabled, locked until, last login) with search/role/enabled filters; **Create user** dialog (username, full name, roles checkboxes, registration number, temporary password with generator);
  edit page (name, roles, enabled, registration number - sends `version`), **Reset password** dialog. Errors: DUPLICATE_USERNAME, SELF_MODIFICATION_NOT_ALLOWED, LAST_ADMIN_REQUIRED, CONCURRENT_MODIFICATION.
  API `listUsers`, `createUser`, `getUser`, `updateUser`, `resetUserPassword`.
- **Audit log:** filters (patient id, user from `listStaff`, action, entity type, from/to <= 366 days), table (time, user, action, entity, patient id, outcome, IP, request id) with details JSON in an expandable row. API `listAuditEvents`.

### 10.18 Common states (all screens)

| State | Pattern |
|---|---|
| Loading | `LoadingSkeleton` shaped like the content; buttons show spinners; never block the whole app except during session bootstrap |
| Empty | `EmptyState` (icon, one sentence, primary action if the user may act) |
| Error (query) | `ErrorPanel` with message from `toUserMessage`, *Retry*, and reference id for 5xx |
| Error (mutation) | toast for 409/422/5xx; field errors inline; form data kept |
| Success | toast with the key fact (RX number, queue number); navigation where the flow continues |
| Offline / network | toast "Network problem - not saved" for mutations; polling views show the stale-data banner |
| 403 | in-page "You do not have permission to view this page" (no redirect loops) |

## 11. Security requirements

1. No credentials, tokens or secrets in source code; `.env*` files git-ignored except `.env.example`.
2. Access token only in memory; refresh token only in the HttpOnly cookie (never readable by JS). No `localStorage`/`sessionStorage`/IndexedDB for any patient, clinical or queue PII data;
   allowed in browser storage: nothing in release 1.0 (UI preferences may be added later only if they contain no PII).
3. Hiding a button is never authorisation; every screen must behave correctly when the API returns 401/403.
4. No `dangerouslySetInnerHTML`; render user text as text; links built from data use `encodeURIComponent`; the `next` redirect parameter accepts only same-origin paths.
5. No server secrets in `NEXT_PUBLIC_*`; `API_PROXY_TARGET` used only in `proxy.ts`.
6. Expired sessions and authorisation errors handled per section 5.2; logout and idle timeout clear the query cache and propagate to other tabs.
7. Public pages import nothing from staff features and never request staff endpoints.
8. CSP, security headers and `Cache-Control: no-store` for staff pages as in section 4.
9. Do not log API responses or form values to the console in production builds (`no-console` lint rule, `console.error` only for unexpected errors without payloads).

## 12. Testing

### 12.1 Tooling and commands

- Vitest + React Testing Library + `@testing-library/user-event` + MSW (handlers return the `openapi.yaml` examples; a helper loads them by operationId so tests use contract-valid data).
- Playwright for e2e against the Docker Compose stack (seed users), with `@axe-core/playwright`.
- Coverage (v8): >= 70% lines for `src/features/**` and `src/lib/**` (`vitest run --coverage` fails below).

### 12.2 Required tests


| ID | Type | File | What it proves | Covers |
|---|---|---|---|---|
| FT-001 | component | `features/auth/LoginForm.test.tsx` | Login form validation, error messages per code (INVALID_CREDENTIALS, ACCOUNT_LOCKED, RATE_LIMITED), redirect by role, mustChangePassword -&gt; /change-password | FR-001 |
| FT-002 | integration | `lib/api/client.test.ts` | Access token held in memory only; single-flight refresh; 401 TOKEN_EXPIRED -&gt; one refresh + retry; REFRESH_TOKEN_ROTATED -&gt; retry after 500 ms; refresh failure -&gt; /login | FR-002 |
| FT-003 | integration | `app/(staff)/layout.test.tsx` | Route guard: anonymous -&gt; /login?next=; wrong role -&gt; /forbidden; protected content not rendered before session bootstrap | FR-006 |
| FT-004 | component | `features/patients/PatientSearch.test.tsx` | Exact number lookup: found -&gt; navigate to history; 404 -&gt; 'Register new patient' with number pre-filled; name search results list | FR-011, FR-012 |
| FT-005 | component | `features/patients/PatientForm.test.tsx` | Zod schema mirrors API: DOB xor estimated age toggle, future DOB, phone pattern, lengths; 409 DUPLICATE_PATIENT_NUMBER shows link to existing patient | FR-013, FR-014 |
| FT-006 | component | `features/consultations/ConsultationForm.test.tsx` | Diagnoses 1-10, prescription editor add/remove/reorder lines up to 30, catalogue vs free-text medicine, inactive medicines not offered, quantity 2 decimals | FR-017, FR-018, FR-019 |
| FT-007 | integration | `features/consultations/submitConsultation.test.tsx` | Submit button disabled while pending; Idempotency-Key stable across retries of one submission and new after success; network error keeps form data; 422 errors mapped to item fields | FR-020, FR-048 |
| FT-008 | component | `features/history/MedicalHistory.test.tsx` | History renders conditions, consultations newest first, status badges (PENDING/IN_PROGRESS/DISPENSED/CANCELLED, FULL/PARTIAL), pagination, empty state | FR-016, FR-022, FR-032 |
| FT-009 | integration | `features/pharmacy/PrescriptionQueue.test.tsx` | Pharmacist list polls at NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS, status tabs, oldest first, stops polling when tab hidden | FR-021, FR-025 |
| FT-010 | component | `features/pharmacy/DispenseDialog.test.tsx` | Quantities default to prescribed; note required below prescribed; all-zero blocked with hint to cancel; confirmation step; 409 shows current status and refreshes | FR-028 |
| FT-011 | component | `features/queue/BookingForm.test.tsx` | Booking validation, queue number shown prominently after success, DUPLICATE_BOOKING confirmation re-submits with allowDuplicate and a new Idempotency-Key | FR-036, FR-037 |
| FT-012 | integration | `features/queue/QueueConsole.test.tsx` | Call next sends expectedLastCalledNumber from latest data; button disabled while pending; 409 QUEUE_STATE_CHANGED refetches and shows toast; complete/skip/requeue/cancel actions per status | FR-039, FR-042 |
| FT-013 | integration | `features/public-queue/PublicQueueDisplay.test.tsx` | Renders serving/waiting numbers only; polling with If-None-Match; stale-data banner after 3 failed polls; 'my number' position computed client-side | FR-044, FR-045, NFR-004 |
| FT-014 | a11y | `e2e/a11y.spec.ts` | Playwright + axe-core on every route in routes.yaml: zero serious/critical violations; keyboard-only completion of login, consultation and dispense flows | NFR-015 |
| FT-015 | integration | `features/auth/useIdleLogout.test.ts` | Logout after NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES without activity; activity resets timer; TanStack cache cleared on logout | FR-003, FR-010, NFR-009 |
| FT-016 | unit | `lib/api/problem.test.ts` | Problem Details parsing; mapping of every ErrorCode to a user message; unknown code fallback; requestId shown in error panel | FR-020 |
| FT-017 | e2e | `e2e/workflows.spec.ts` | Playwright against docker compose stack: Workflows A-E end to end (existing patient, new patient, telephone booking, public display update, call next) | FR-021, FR-049, NFR-004, NFR-014, NFR-023, NFR-027, NFR-028 |
| FT-018 | e2e | `e2e/responsive.spec.ts` | Screens at 360, 768, 1280 and 1920 px: no horizontal scroll, navigation usable, public display readable at 1920x1080 | NFR-016 |



### 12.3 Key scenarios (minimum)

- FT-007: double-clicking *Submit consultation* sends exactly one request; a simulated network failure then retry sends the **same** Idempotency-Key; after success the next submission uses a new key.
- FT-012: with MSW returning 409 QUEUE_STATE_CHANGED, the console refetches the session and does not call `call-next` again; the button is disabled while the request is pending.
- FT-013: the rendered public page contains no text from the staff-only fields of the seed (e.g. "Ishara", "0759876543"); 304 responses keep the previous numbers; the stale banner appears after 3 failures.
- FT-003: navigating to `/doctor/dashboard` as a pharmacist renders the forbidden state and fires no doctor-only API call.
- FT-014: axe on every route of section 13.3 with zero serious/critical violations.

## 13. Completion criteria

### 13.1 Commands

```bash
cd frontend
npm ci
npm run gen:api            # regenerate src/lib/api/schema.d.ts from ../docs/openapi.yaml
npm run dev                # http://localhost:3000 (needs the backend on API_PROXY_TARGET, default http://localhost:8080)
npm run lint               # eslint (zero warnings in CI: --max-warnings=0)
npm run format:check       # prettier --check .
npm run typecheck          # tsc --noEmit
npm run test               # vitest run --coverage
npm run build && npm start # production build
npm run e2e                # playwright test (expects `docker compose up` from the repo root)
```

`package.json` scripts must exist with exactly these names.

### 13.2 Required environment variables

`API_PROXY_TARGET` (runtime, server-side). All `NEXT_PUBLIC_*` variables have defaults (section 3.1).

### 13.3 Route checklist

- [ ] `/login` (SCR-01, public) - Login
- [ ] `/change-password` (SCR-01b, ADMIN, DOCTOR, PHARMACIST) - Change password (forced and voluntary)
- [ ] `/doctor/dashboard` (SCR-02, DOCTOR) - Doctor dashboard (today's queue widget, quick patient search, my recent prescriptions)
- [ ] `/doctor/patients/search` (SCR-03, DOCTOR) - Patient ID search (exact number lookup + name/phone search)
- [ ] `/doctor/patients/new` (SCR-05, DOCTOR) - New patient registration (?patientNumber= pre-fill, ?queueEntryId= carried to consultation)
- [ ] `/doctor/patients/[patientId]` (SCR-04, DOCTOR) - Patient medical history (+ edit demographics dialog)
- [ ] `/doctor/consultations/new` (SCR-06, DOCTOR) - New consultation form with prescription editor (?patientId= required, ?queueEntryId= optional)
- [ ] `/doctor/consultations/[consultationId]` (SCR-08, DOCTOR) - Consultation detail - submission confirmation and live dispensing status; cancel / re-issue prescription
- [ ] `/doctor/prescriptions` (SCR-09, DOCTOR) - My prescriptions and their dispensing status
- [ ] `/pharmacist/dashboard` (SCR-10a, PHARMACIST) - Pharmacist dashboard (counts, oldest pending, today's queue summary)
- [ ] `/pharmacist/prescriptions` (SCR-10, PHARMACIST) - Pharmacist prescription queue (tabs by status)
- [ ] `/pharmacist/prescriptions/[prescriptionId]` (SCR-11, PHARMACIST) - Prescription details and dispensing confirmation
- [ ] `/medicines` (SCR-16, PHARMACIST, ADMIN) - Medicine catalogue management
- [ ] `/bookings/new` (SCR-12, DOCTOR, PHARMACIST) - Telephone / walk-in booking registration (?queueSessionId=)
- [ ] `/queue` (SCR-13, DOCTOR, PHARMACIST) - Queue management dashboard - today's sessions, create/open/close session
- [ ] `/queue/[queueSessionId]` (SCR-13b, DOCTOR, PHARMACIST) - Queue session console - entries list, call next (doctor), call/complete/skip/requeue/cancel
- [ ] `/admin/users` (SCR-17, ADMIN) - Staff accounts list + create user dialog
- [ ] `/admin/users/[userId]` (SCR-17b, ADMIN) - Edit user, enable/disable, reset password
- [ ] `/admin/audit-events` (SCR-18, ADMIN) - Audit log viewer
- [ ] `/public/queue` (SCR-14a, public) - Public list of today's queues
- [ ] `/public/queue/[queueSessionId]` (SCR-14, public) - Public queue display (TV / phone)


### 13.4 Functional requirement checklist (frontend part)

- [ ] **FR-001** Staff login - screens: `/login`; tests: FT-001
- [ ] **FR-002** Session refresh with rotation - screens: `/login`; tests: FT-002
- [ ] **FR-003** Logout - screens: `/change-password`; tests: FT-015
- [ ] **FR-004** Password change and forced change - screens: `/change-password`; tests: -
- [ ] **FR-005** Account lockout - screens: `/login`; tests: -
- [ ] **FR-006** Role-based access control - screens: `/login`; tests: FT-003
- [ ] **FR-007** Staff account administration - screens: `/admin/users`, `/admin/users/[userId]`; tests: -
- [ ] **FR-008** Staff directory - screens: `/queue`, `/admin/audit-events`; tests: -
- [ ] **FR-010** Idle logout on shared workstations - screens: `/doctor/dashboard`, `/pharmacist/prescriptions`; tests: FT-015
- [ ] **FR-011** Look up patient by patient number - screens: `/doctor/patients/search`, `/doctor/dashboard`; tests: FT-004
- [ ] **FR-012** Search patients - screens: `/doctor/patients/search`; tests: FT-004
- [ ] **FR-013** Register new patient - screens: `/doctor/patients/new`; tests: FT-005
- [ ] **FR-014** Unknown date of birth - screens: `/doctor/patients/new`, `/doctor/patients/[patientId]`; tests: FT-005
- [ ] **FR-015** Update patient demographics - screens: `/doctor/patients/[patientId]`; tests: -
- [ ] **FR-016** View medical history - screens: `/doctor/patients/[patientId]`; tests: FT-008
- [ ] **FR-017** Record a consultation - screens: `/doctor/consultations/new`; tests: FT-006
- [ ] **FR-018** Multi-medicine prescription - screens: `/doctor/consultations/new`; tests: FT-006
- [ ] **FR-019** Catalogue and free-text medicines - screens: `/doctor/consultations/new`; tests: FT-006
- [ ] **FR-020** Atomic consultation submission - screens: `/doctor/consultations/new`; tests: FT-007, FT-016
- [ ] **FR-021** Automatic routing to the pharmacist queue - screens: `/doctor/consultations/new`, `/pharmacist/prescriptions`; tests: FT-009, FT-017
- [ ] **FR-022** Submission confirmation and consultation detail - screens: `/doctor/consultations/[consultationId]`; tests: FT-008
- [ ] **FR-024** Link consultation to queue entry - screens: `/doctor/consultations/new`; tests: -
- [ ] **FR-025** Pharmacist prescription queue - screens: `/pharmacist/prescriptions`, `/pharmacist/dashboard`; tests: FT-009
- [ ] **FR-026** Prescription detail for dispensing - screens: `/pharmacist/prescriptions/[prescriptionId]`; tests: -
- [ ] **FR-027** Mark in progress - screens: `/pharmacist/prescriptions/[prescriptionId]`; tests: -
- [ ] **FR-028** Dispense with per-item record - screens: `/pharmacist/prescriptions/[prescriptionId]`; tests: FT-010
- [ ] **FR-029** Exactly-once dispensing - screens: `/pharmacist/prescriptions/[prescriptionId]`; tests: -
- [ ] **FR-030** Cancel prescription - screens: `/doctor/consultations/[consultationId]`, `/pharmacist/prescriptions/[prescriptionId]`; tests: -
- [ ] **FR-031** Add or re-issue a prescription - screens: `/doctor/consultations/[consultationId]`; tests: -
- [ ] **FR-032** Doctor sees dispensing status - screens: `/doctor/prescriptions`, `/doctor/consultations/[consultationId]`, `/doctor/patients/[patientId]`; tests: FT-008
- [ ] **FR-033** Medicine catalogue management - screens: `/medicines`; tests: -
- [ ] **FR-034** Create queue session - screens: `/queue`; tests: -
- [ ] **FR-035** Open and close session - screens: `/queue`, `/queue/[queueSessionId]`; tests: -
- [ ] **FR-036** Telephone and walk-in booking - screens: `/bookings/new`, `/queue/[queueSessionId]`; tests: FT-011
- [ ] **FR-037** Duplicate booking warning - screens: `/bookings/new`; tests: FT-011
- [ ] **FR-038** Cancel booking - screens: `/queue/[queueSessionId]`; tests: -
- [ ] **FR-039** Call next patient (doctor's queue button) - screens: `/doctor/dashboard`, `/queue/[queueSessionId]`; tests: FT-012
- [ ] **FR-040** Call a specific patient - screens: `/queue/[queueSessionId]`; tests: -
- [ ] **FR-041** Complete, skip and requeue - screens: `/queue/[queueSessionId]`, `/doctor/dashboard`; tests: -
- [ ] **FR-042** Staff queue status - screens: `/doctor/dashboard`, `/queue/[queueSessionId]`; tests: FT-012
- [ ] **FR-043** Public list of today's queues - screens: `/public/queue`; tests: -
- [ ] **FR-044** Public queue display - screens: `/public/queue/[queueSessionId]`; tests: FT-013
- [ ] **FR-045** Position helper for patients - screens: `/public/queue/[queueSessionId]`; tests: FT-013
- [ ] **FR-047** Audit log viewer - screens: `/admin/audit-events`; tests: -
- [ ] **FR-048** Idempotent create operations - screens: `/doctor/patients/new`, `/doctor/consultations/new`, `/doctor/consultations/[consultationId]`, `/bookings/new`, `/pharmacist/prescriptions/[prescriptionId]`; tests: FT-007


### 13.5 API integration checklist

- [ ] `schema.d.ts` generated from `docs/openapi.yaml` and committed; CI diff check passes.
- [ ] Every function of section 5.3 implemented with the listed query key / invalidation and polling.
- [ ] Idempotency-Key sent for `createPatient`, `createConsultation`, `addPrescriptionToConsultation`, `createBooking`, `dispensePrescription`.
- [ ] `expectedLastCalledNumber` sent from the latest session data for every call-next.
- [ ] Problem Details handled for every code in `error-messages.ts`; field errors mapped.
- [ ] ETag/If-None-Match used for `getQueueSession` and `getPublicQueueStatus`.

### 13.6 Responsive behaviour checklist

- [ ] 360 px: no horizontal scroll; sidebar becomes a sheet; tables become cards; dialogs full-screen.
- [ ] 768 px: two-column forms collapse correctly; prescription editor rows wrap without overlap.
- [ ] 1280 px: consultation form shows the sticky patient summary column.
- [ ] 1920x1080: public display fills the screen; now-serving digits >= 160 px; readable at 5 m.
- [ ] Keyboard-only: login, consultation submission, dispensing and call-next are possible without a mouse.

### 13.7 Known limitations and deferred features (do not implement)

- No patient login or self-booking; no notifications; no printing of prescriptions/labels/tickets.
- Polling instead of push updates; consultation detail polling only while a prescription is active.
- No offline mode; no browser persistence of drafts (a reload loses an unsaved consultation - the leave-page warning mitigates this).
- English UI only (strings centralised for later localisation).
- No inventory or stock display; no clinical decision support.
