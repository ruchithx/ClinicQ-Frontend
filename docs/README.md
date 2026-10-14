# Dispensary Management System - Documentation Set (release 1.0)

Version 1.0.0 - prepared 12 October 2026

Requirements, architecture, database design, API contract and implementation guides for a Dispensary Management System
(patient records, consultations, prescriptions, pharmacy dispensing, telephone bookings and a public queue display).
Stack: Next.js 16 + TypeScript, Spring Boot 4.1 (Java 21), PostgreSQL 16, Flyway, Docker Compose. **No application code is included** -
this set is the specification for implementing it.

## Files

| File | Purpose |
|---|---|
| `01-Software-Requirements-Specification.pdf` | What the system must do: scope and out-of-scope, roles and permission matrix, 50 functional requirements (FR-001..FR-050) with acceptance criteria, 30 non-functional requirements with proposed measurable targets, business rules, workflows A-E, use cases, validation rules, error handling, security/privacy, audit, assumptions, **open questions with proposed defaults**, future enhancements, traceability matrix and test catalogue. |
| `02-Database-and-System-Architecture.pdf` | How it is built: architecture decisions, component responsibilities, sequence diagrams, real-time strategy (polling + ETag), auth flow, deployment (local and production), identifier strategy, ERDs, full data dictionary, complete DDL, example queries, indexing, normalisation, transactions/locking/idempotency, Flyway strategy, seed data. |
| `03-REST-API-Documentation.pdf` | Every one of the 49 operations with roles, headers, parameters, request/response examples, validation table, business rules, error codes and examples, affected tables and concurrency notes; error catalogue; schemas. Generated from `openapi.yaml`. |
| `openapi.yaml` | Machine-readable **OpenAPI 3.1** contract - the source of truth for paths, fields, enums and error codes. Validated with openapi-spec-validator; all 49 operations have request/response examples that validate against their schemas. |
| `backend-requirements.md` | Implementation guide for the Spring Boot backend (hand to Claude Code). Self-contained: versions, Maven dependencies, package structure, configuration, Dockerfile, the full Flyway migration and seed, entity rules, locking, idempotency, every endpoint with its authorisation, security design, business logic per module, error mapping, logging, test cases, commands and definition of done. |
| `frontend-requirements.md` | Implementation guide for the Next.js frontend (hand to Claude Code). Routes, project layout, runtime proxy and CSP, typed API client generated from `openapi.yaml`, auth/session handling, TanStack Query keys/invalidation/polling, Zod schemas, design system, every screen with states, security rules, tests, commands and checklists. |
| `diagrams/*.mmd` | Mermaid sources of all diagrams (see below). |
| `sql/V1__initial_schema.sql` | The Flyway migration (identical to the DDL in the PDF and in backend-requirements.md). Executed successfully against PostgreSQL 16. |
| `sql/R__dev_seed.sql` | Development-only seed data (repeatable migration, dev profile only). Dev password for all seed users: `DevPassword#2026`. |
| `sql/example-queries.sql` | The example queries of the architecture document, executable against the seed data. |
| `docker-compose.example.yml` | The local-development Compose file (copy to the repository root as `docker-compose.yml`). |
| `.env.example` | All environment variables with local-development values (copy to `.env`; never commit `.env`). |

### Diagrams

| File | Shows |
|---|---|
| `diagrams/system-architecture.mmd` | High-level architecture (clients, reverse proxy, Next.js, Spring Boot modules, PostgreSQL, backups) |
| `diagrams/deployment-architecture.mmd` | Production reference deployment |
| `diagrams/deployment-local.mmd` | Local Docker Compose deployment |
| `diagrams/backend-components.mmd` | Backend components and layering |
| `diagrams/database-erd.mmd` | ERD overview (generated from the migration) |
| `diagrams/erd-patient-consultation.mmd`, `erd-prescription-dispensing.mmd`, `erd-queue.mmd`, `erd-security-audit.mmd` | Domain ERDs with all columns (generated) |
| `diagrams/consultation-pharmacy-sequence.mmd` | Workflows A/B: lookup/registration -> consultation -> pharmacist dispensing -> doctor sees status |
| `diagrams/booking-queue-sequence.mmd` | Workflows C/E: telephone booking (gap-free numbers) and call-next (compare-and-set) |
| `diagrams/public-queue-sequence.mmd` | Workflow D: public display polling with ETag/304 |
| `diagrams/auth-flow-sequence.mmd` | Login, bearer calls, refresh rotation and reuse detection, logout |
| `diagrams/prescription-state.mmd`, `queue-entry-state.mmd`, `queue-session-state.mmd` | Canonical state machines |

**Rendering the diagrams:**

- GitHub and GitLab render `.mmd` content inside ```` ```mermaid ```` blocks; VS Code with the "Markdown Preview Mermaid Support" extension; or paste into <https://mermaid.live>.
- Command line (Mermaid CLI 11):
  ```bash
  npm install -g @mermaid-js/mermaid-cli
  for f in diagrams/*.mmd; do mmdc -i "$f" -o "${f%.mmd}.svg" -b white; done
  ```
- The PDFs contain all diagrams already rendered. In the architecture PDF the ERDs are drawn with Graphviz from the same generated model (more compact), and the two long sequence
  diagrams are printed in parts; the `.mmd` files remain the single sources.

## Recommended order for Claude Code

1. **Owner review first.** Read SRS section 3 (decisions) and section 15.3 (open questions Q-01..Q-19). Every question has a proposed default that the documents already implement; change the
   documents (and `openapi.yaml`) before coding if the owner decides differently.
2. **Create the repository** `dispensary-management/` with `backend/`, `frontend/`, `docs/` (copy this whole folder into `docs/`), `docker-compose.yml` (from `docker-compose.example.yml`) and `.env.example`.
3. **Backend session.** Prompt: *"Implement the backend exactly as specified in docs/backend-requirements.md. The API contract is docs/openapi.yaml and the schema is
   docs/sql/V1__initial_schema.sql; do not deviate. Work module by module in this order: common/config/security/auth/user -> patient -> medicine -> consultation/prescription -> pharmacy -> queue -> audit/retention.
   After each module run ./mvnw verify. Finish with the definition of done in section 15.3."*
4. **Verify the backend** with `./mvnw clean verify` (includes the contract test BT-029 against `docs/openapi.yaml`) and `docker compose up --build db backend`; open Swagger at <http://localhost:8080/swagger-ui.html>.
5. **Frontend session.** Prompt: *"Implement the frontend exactly as specified in docs/frontend-requirements.md. Generate the API types from docs/openapi.yaml first (npm run gen:api) and use
   only those types. Build the screens in section 10 in order, then the tests in section 12. Finish with the checklists in section 13."*
6. **End-to-end.** `docker compose up --build`, then `cd frontend && npm run e2e` (Playwright workflows A-E and accessibility).
7. **Before production:** resolve SRS section 12.6 (legal, clinical and operational confirmations), set production environment variables, configure HTTPS, backups (NFR-006) and run the k6 performance scripts.

Tips: give Claude Code one guide per session, keep `docs/` read-only during implementation, and ask it to report contract conflicts rather than resolving them silently.

## Key design decisions (summary)

| Topic | Decision |
|---|---|
| Doctor's "increase queue number" button | Means **call the next patient** - atomic, compare-and-set on the displayed number; never creates bookings (SRS 3.2) |
| Queue numbering | Per queue session, starting at 1, gap-free (row lock on the session counter), never reused, max 999; sessions are per date, so numbering restarts at least daily |
| Real-time updates | Polling every 5 s with ETag/304; SSE is a documented future upgrade |
| Patient identifier | Staff-entered clinic-card number `patientNumber` (unique, upper-case, immutable) + internal UUID |
| Date of birth | Always stored; unknown DOB -> estimated age converts to a flagged estimated DOB; age is computed |
| Medical history | Insert-only consultations with diagnoses, prescriptions and dispensing records - nothing is overwritten |
| Prescription lifecycle | `PENDING -> IN_PROGRESS -> DISPENSED`, `-> CANCELLED`; terminal states never change; corrections = cancel + re-issue |
| Dispensing | Per-item quantities, FULL/PARTIAL outcome, pharmacist and timestamp; exactly once (row lock + unique constraint + idempotency key) |
| Unavailable medicines | Catalogue `active=false` blocks prescribing; at the counter short supply is recorded as partial / not dispensed; **no inventory** |
| Roles | DOCTOR, PHARMACIST, plus minimal ADMIN (accounts, audit, catalogue - no clinical data); patients are unauthenticated public users |
| Auth | 15-min JWT in memory + rotating 12-h refresh token in an HttpOnly SameSite=Strict cookie; lockout; idle logout 30 min |
| Errors | RFC 9457 Problem Details with 55 stable error codes |
| Privacy | Dedicated DTO per audience; public endpoints return numbers only; no PHI in logs or browser storage; append-only audit trail |

## How this set was validated

- The migration was applied to PostgreSQL 16 together with the seed (twice, idempotent), all example queries, 15 negative constraint tests and a 60-way concurrent booking test.
- `openapi.yaml` passes OpenAPI 3.1 validation; all 444 examples validate against their schemas (formats, enums, `oneOf`, `if/then`, unknown properties).
- An automated cross-check verifies that every operation is traced to a requirement and used by a frontend route, that route roles match operation roles, that enum values equal the
  database CHECK constraints, that API string lengths equal column sizes, and that every test is referenced by a requirement.
- All Mermaid sources render with Mermaid CLI 11; the PDFs were opened and checked for sections and figures.

## Unresolved questions

See SRS section 15.3 (Q-01..Q-19) and section 12.6 (items the owner must confirm before production, including which data-protection and
medical-records laws apply). No compliance with any specific regulation is claimed.
