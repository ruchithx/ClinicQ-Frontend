# Backend Implementation Requirements - Dispensary Management System

Version 1.0.0 - 12 October 2026 - target: Spring Boot backend, release 1.0

> **For Claude Code.** This file is a complete, binding specification of the backend. Implement exactly what it says.
> The API contract is `docs/openapi.yaml` (49 operations): paths, methods, status codes, JSON field names, types,
> nullability, enums and error codes must match it exactly. The database schema is `V1__initial_schema.sql` (section 6.1) - copy it
> verbatim. If anything here appears to conflict with `openapi.yaml` or the migration, those files win; stop and report the conflict
> instead of inventing behaviour. Do not add endpoints, fields, tables or statuses that are not specified. Do not implement inventory,
> patient login, notifications or any clinical decision support (diagnosis, dosing, interaction checks).

Related documents (in `docs/`): `01-Software-Requirements-Specification.pdf` (requirements FR/NFR/BR), `02-Database-and-System-Architecture.pdf`
(design rationale, data dictionary, sequence diagrams), `03-REST-API-Documentation.pdf` (per-endpoint rules), `frontend-requirements.md`.

## Contents

1. Deliverables and repository layout
2. Technology and versions
3. Package structure and layer responsibilities
4. Configuration and environment variables
5. Docker
6. Database implementation
7. Transactions, locking and idempotency
8. API implementation
9. Authentication and authorisation
10. Business logic by module
11. Error handling
12. Logging and observability
13. Testing
14. Implementation conventions (mandatory)
15. Completion criteria

---

## 1. Deliverables and repository layout

The repository is a mono-repo. The backend lives in `backend/`:

```text
dispensary-management/
├── backend/                         # this specification
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd, .mvn/
│   ├── Dockerfile
│   ├── src/main/java/com/dispensary/dms/...
│   ├── src/main/resources/
│   │   ├── application.yml, application-dev.yml, application-prod.yml
│   │   ├── db/migration/V1__initial_schema.sql
│   │   ├── db/seed/R__dev_seed.sql
│   │   └── security/common-passwords.txt   # deny-list, 10 000 most common passwords (one per line, lower-case)
│   ├── src/test/java/com/dispensary/dms/...
│   └── perf/                        # k6 scripts + generate-perf-data.sql (section 13.6)
├── frontend/                        # see frontend-requirements.md
├── docs/                            # this documentation set, incl. openapi.yaml
├── docker-compose.yml               # section 5.2
└── .env.example                     # section 4.4
```

Backend deliverables: runnable Spring Boot application exposing the contract; Flyway migrations; Dockerfile; tests (section 13);
k6 scripts and the performance data generator; a `backend/README.md` repeating the commands of section 15.

## 2. Technology and versions

| Item | Version / choice | Notes |
|---|---|---|
| Java | 21 (LTS), Eclipse Temurin | Java 25 LTS is acceptable if all plugins support it |
| Spring Boot | 4.1.x, latest patch (parent `spring-boot-starter-parent`) | Spring Framework 7, Spring Security 7, Hibernate ORM 7, Jackson 3 |
| Build | Maven 3.9+ with Maven Wrapper | |
| Database | PostgreSQL 16 | `postgres:16-alpine` image |
| Migrations | Flyway via `spring-boot-starter-flyway` + `org.flywaydb:flyway-database-postgresql` | Boot 4 requires the starter |
| API docs | `org.springdoc:springdoc-openapi-starter-webmvc-ui` 3.0.x (the line for Spring Boot 4) | verify the newest 3.x on Maven Central |
| Mapping | MapStruct 1.6.x (`mapstruct` + `mapstruct-processor`) | no reflection mappers |
| Rate limiting | `com.bucket4j:bucket4j_jdk17-core` 8.x | in-memory, per instance |
| Tests | JUnit 5, Mockito, AssertJ, Testcontainers 2 (versions from the Boot BOM), ArchUnit 1.3+, JaCoCo 0.8.12+ | |
| Lombok | **not used** | use Java records and explicit code |

### 2.1 Maven dependencies (Spring Boot 4 artifact names)

```xml
<dependencies>
  <!-- web, validation, security, data -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security-oauth2-resource-server</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-flyway</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <dependency><groupId>io.micrometer</groupId><artifactId>micrometer-registry-prometheus</artifactId></dependency>
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
  <dependency><groupId>org.springdoc</groupId><artifactId>springdoc-openapi-starter-webmvc-ui</artifactId><version>${springdoc.version}</version></dependency>
  <dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><version>${mapstruct.version}</version></dependency>
  <dependency><groupId>com.bucket4j</groupId><artifactId>bucket4j_jdk17-core</artifactId><version>${bucket4j.version}</version></dependency>
  <!-- tests -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc-test</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa-test</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security-test</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-flyway-test</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-testcontainers</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.testcontainers</groupId><artifactId>testcontainers-postgresql</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.testcontainers</groupId><artifactId>testcontainers-junit-jupiter</artifactId><scope>test</scope></dependency>
  <dependency><groupId>com.tngtech.archunit</groupId><artifactId>archunit-junit5</artifactId><version>${archunit.version}</version><scope>test</scope></dependency>
  <dependency><groupId>com.networknt</groupId><artifactId>json-schema-validator</artifactId><version>1.5.x</version><scope>test</scope></dependency>
</dependencies>
```

Rules: let the Spring Boot BOM manage every version it knows; pin only springdoc, MapStruct, Bucket4j, ArchUnit and the JSON-schema
validator in `<properties>`. If an artifact name does not resolve (Boot 4 renamed several starters and Testcontainers 2 renamed modules to
`testcontainers-<module>`), consult the Spring Boot 4 migration guide; do **not** downgrade to Spring Boot 3. Configure the
`maven-compiler-plugin` with `-parameters` and the MapStruct annotation processor (`mapstruct.defaultComponentModel=spring`), the
JaCoCo plugin with the coverage gate of section 13.1, and the Surefire/Failsafe split (`*Test` unit, `*IT` integration).

## 3. Package structure and layer responsibilities

Base package `com.dispensary.dms`. One package per module; inside each module the same sub-packages.

```text
com.dispensary.dms
├── DmsApplication.java
├── config/          # JacksonConfig, OpenApiConfig, ClockConfig, SchedulingConfig, WebConfig (CORS), JpaConfig
├── security/        # SecurityConfig, JwtConfig, TokenService, CurrentUser, PasswordChangeRequiredFilter,
│                    # RateLimitFilter, RestAuthenticationEntryPoint, RestAccessDeniedHandler
├── common/          # error/ (ErrorCode, ApiException + subclasses, GlobalExceptionHandler, ConstraintErrorMapper)
│                    # web/ (PageResponse, SortWhitelist, RequestIdFilter), time/ (BusinessClock),
│                    # idempotency/ (IdempotencyService, IdempotencyKeyEntity, repository), validation/ (custom validators)
├── auth/            # AuthController, AuthService, RefreshTokenService, RefreshTokenEntity/Repository, PasswordPolicy, dto/
├── user/            # UserController, StaffController, UserService, BootstrapAdminRunner, UserEntity, Role, repository, dto/, mapper/
├── patient/         # PatientController, PatientService, MedicalHistoryService, PatientEntity, repository, dto/, mapper/
├── consultation/    # ConsultationController, ConsultationService, ConsultationEntity, DiagnosisEntity, repositories, dto/, mapper/
├── prescription/    # PrescriptionController, PrescriptionService, PrescriptionStateMachine, PrescriptionEntity, PrescriptionItemEntity, ...
├── pharmacy/        # DispensingController, DispensingService, DispensingEntity, DispensingItemEntity, repositories, dto/
├── medicine/        # MedicineController, MedicineService, MedicineEntity, repository, dto/, mapper/
├── queue/           # QueueSessionController, BookingController, QueueEntryController, PublicQueueController,
│                    # QueueSessionService, QueueEntryService, PublicQueueService, QueueEntryStateMachine, entities, repositories, dto/
├── audit/           # AuditController, AuditService, AuditAction, AuditEventEntity, repository, dto/
└── retention/       # RetentionJob, SessionAutoCloseJob
```

| Layer | Owns | Must not |
|---|---|---|
| Controller (`*Controller`) | HTTP mapping, `@Valid` request DTOs, `@PreAuthorize`, reading headers (Idempotency-Key, If-None-Match), building `ResponseEntity` (status, Location, ETag, Cache-Control) | business rules, repositories, transactions, entity types |
| Service (`*Service`) | `@Transactional` boundaries, business rules, state machines, ownership checks, idempotency, audit calls, mapping to DTOs (via mappers) | HTTP types (`HttpServletRequest`, `ResponseEntity`) |
| State machine (`*StateMachine`) | pure transition tables (no Spring, unit-testable) | I/O |
| Repository | Spring Data interfaces, JPQL/native queries, locking finders, projections | business decisions |
| Entity | JPA mapping of exactly one table | being serialised to JSON |
| DTO (`dto/`) | Java records mirroring `openapi.yaml` schemas 1:1 (same names) | JPA annotations |
| Mapper (`mapper/`) | MapStruct entity -> DTO | queries (no lazy loading inside mappers outside a transaction) |

ArchUnit tests (section 13) enforce: controllers depend only on services/DTOs; services do not depend on controllers; entities are not used in
controller method signatures; modules access other modules only through their `*Service` classes; `common` depends on no module.

## 4. Configuration and environment variables

### 4.1 `application.yml` (all profiles)

```yaml
spring:
  application.name: dms-backend
  threads.virtual.enabled: true
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: ${DB_POOL_MAX_SIZE:10}
      connection-init-sql: "SET lock_timeout = '5s'; SET statement_timeout = '15s'"
  jpa:
    open-in-view: false
    hibernate.ddl-auto: validate
    properties:
      hibernate.jdbc.time_zone: UTC
      hibernate.jdbc.batch_size: 50
      hibernate.order_inserts: true
      hibernate.default_batch_fetch_size: 50
      hibernate.query.fail_on_pagination_over_collection_fetch: true
  flyway:
    enabled: true
    locations: classpath:db/migration
    user: ${DB_MIGRATION_USERNAME:${DB_USERNAME}}
    password: ${DB_MIGRATION_PASSWORD:${DB_PASSWORD}}
    validate-on-migrate: true
    clean-disabled: true
  jackson:
    default-property-inclusion: always        # nulls are serialised (contract: optional fields present as null)
    deserialization.fail-on-unknown-properties: true
  servlet.multipart.enabled: false
  mvc.problemdetails.enabled: true
server:
  port: ${SERVER_PORT:8080}
  forward-headers-strategy: ${SERVER_FORWARD_HEADERS_STRATEGY:none}
  error.include-stacktrace: never
  tomcat.max-swallow-size: 256KB
  max-http-request-header-size: 16KB
management:
  endpoints.web.exposure.include: health,prometheus
  endpoint.health:
    show-details: never
    probes.enabled: true
  health.readinessstate.enabled: true
  health.livenessstate.enabled: true
logging:
  structured.format.console: ${LOGGING_STRUCTURED_FORMAT_CONSOLE:ecs}
app:
  timezone: ${APP_TIMEZONE:Asia/Colombo}
  jwt:
    secret: ${APP_JWT_SECRET}
    issuer: ${APP_JWT_ISSUER:dms-api}
    access-token-ttl: ${APP_JWT_ACCESS_TOKEN_TTL:PT15M}
    refresh-token-ttl: ${APP_JWT_REFRESH_TOKEN_TTL:PT12H}
  refresh-cookie.secure: ${APP_REFRESH_COOKIE_SECURE:true}
  cors.allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:}
  swagger.enabled: ${APP_SWAGGER_ENABLED:false}
  rate-limit:
    login-per-minute: ${APP_RATE_LIMIT_LOGIN_PER_MINUTE:10}
    public-per-minute: ${APP_RATE_LIMIT_PUBLIC_PER_MINUTE:120}
  retention.queue-pii-days: ${APP_RETENTION_QUEUE_PII_DAYS:90}
  bootstrap-admin:
    username: ${APP_BOOTSTRAP_ADMIN_USERNAME:}
    password: ${APP_BOOTSTRAP_ADMIN_PASSWORD:}
springdoc:
  api-docs.enabled: ${APP_SWAGGER_ENABLED:false}
  swagger-ui.enabled: ${APP_SWAGGER_ENABLED:false}
  swagger-ui.path: /swagger-ui.html
```

**Actuator exposure.** Actuator runs on the application port (8080) so that Docker healthchecks and the reverse proxy can reach the health paths
documented in `openapi.yaml` (`/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`), which the security chain permits
anonymously. `/actuator/prometheus` is permitted only for requests from private/loopback addresses (security-chain `access(...)` check) and is
not routed by the reverse proxy. Every other actuator path is denied.

Bind `app.*` to a validated `@ConfigurationProperties` record `AppProperties` (`@Validated`, `@NotBlank` secret, `Duration` types).
Startup must fail if `APP_JWT_SECRET` is missing or decodes (Base64) to fewer than 32 bytes, or if the bootstrap password is set but shorter than 12 characters.

### 4.2 Profiles

| Profile | Differences |
|---|---|
| `dev` | `spring.flyway.locations: classpath:db/migration,classpath:db/seed`; `logging.structured.format.console:` (empty = readable); SQL logging off by default (`logging.level.org.hibernate.SQL: debug` may be enabled locally); expects `APP_SWAGGER_ENABLED=true`, `APP_REFRESH_COOKIE_SECURE=false` from `.env` |
| `prod` | default; nothing relaxed; refuses to start if `spring.flyway.locations` contains `db/seed` or if `app.refresh-cookie.secure=false` (fail-fast check in an `ApplicationRunner`) |
| `test` | used by tests; Testcontainers provides the datasource; fixed `Clock` bean overridable per test |

### 4.3 Environment variables


| Variable | Component | Required | Secret | Default | Local dev value | Description |
|---|---|---|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | backend | no | no | `prod` | `dev` | Active Spring profile. dev adds seed data (classpath:db/seed), enables Swagger UI and relaxes cookie Secure flag. Never run dev in production. |
| `SERVER_PORT` | backend | no | no | `8080` | `8080` | HTTP port of the API. |
| `DB_URL` | backend | yes | no | - | `jdbc:postgresql://db:5432/dms` | JDBC URL of the PostgreSQL database. Mapped to spring.datasource.url and spring.flyway.url. |
| `DB_USERNAME` | backend | yes | no | - | `dms` | Database user used by the application and Flyway. |
| `DB_PASSWORD` | backend | yes | yes | - | `dms_dev_password` | Database password. |
| `DB_MIGRATION_USERNAME` | backend | no | no | `${DB_USERNAME}` | - | Optional separate schema-owner user for Flyway (production hardening). Defaults to DB_USERNAME. |
| `DB_MIGRATION_PASSWORD` | backend | no | yes | `${DB_PASSWORD}` | - | Password of DB_MIGRATION_USERNAME. Defaults to DB_PASSWORD. |
| `DB_POOL_MAX_SIZE` | backend | no | no | `10` | `10` | HikariCP maximum pool size. |
| `APP_JWT_SECRET` | backend | yes | yes | - | `ZGV2LW9ubHktc2VjcmV0LWNoYW5nZS1tZS0wMTIzNDU2Nzg5YWJjZGVm` | Base64-encoded HMAC-SHA256 key, at least 32 bytes after decoding. Startup fails if missing or shorter. Generate with: openssl rand -base64 48. |
| `APP_JWT_ISSUER` | backend | no | no | `dms-api` | `dms-api` | iss claim written to and required on access tokens. |
| `APP_JWT_ACCESS_TOKEN_TTL` | backend | no | no | `PT15M` | `PT15M` | Access-token lifetime (ISO-8601 duration). |
| `APP_JWT_REFRESH_TOKEN_TTL` | backend | no | no | `PT12H` | `PT12H` | Absolute lifetime of a login (refresh-token family), ISO-8601 duration. |
| `APP_REFRESH_COOKIE_SECURE` | backend | no | no | `true` | `false` | Secure attribute of the dms_refresh cookie. Must be true in any environment served over HTTPS. |
| `APP_CORS_ALLOWED_ORIGINS` | backend | no | no | - | `http://localhost:3000` | Comma-separated list of allowed browser origins. Empty = CORS disabled (same-origin deployment through the reverse proxy / Next.js rewrites). |
| `APP_TIMEZONE` | backend | no | no | `Asia/Colombo` | `Asia/Colombo` | IANA time zone of the dispensary. Defines 'today' for queue sessions, session-date validation and age calculation. Instants are always stored in UTC. |
| `APP_BOOTSTRAP_ADMIN_USERNAME` | backend | no | no | - | - | If set and the users table is empty at startup, an ADMIN with this username is created (must_change_password = true). |
| `APP_BOOTSTRAP_ADMIN_PASSWORD` | backend | no | yes | - | - | Initial password for the bootstrap admin (min 12 chars). Remove from the environment after first login. |
| `APP_SWAGGER_ENABLED` | backend | no | no | `false` | `true` | Exposes /swagger-ui.html and /v3/api-docs. Keep false in production unless protected by the network. |
| `APP_RATE_LIMIT_LOGIN_PER_MINUTE` | backend | no | no | `10` | `10` | Max POST /auth/login requests per client IP per minute. |
| `APP_RATE_LIMIT_PUBLIC_PER_MINUTE` | backend | no | no | `120` | `600` | Max /api/v1/public/** requests per client IP per minute. |
| `APP_RETENTION_QUEUE_PII_DAYS` | backend | no | no | `90` | `90` | Queue entries older than this have name, phone and notes removed by the nightly retention job. |
| `SERVER_FORWARD_HEADERS_STRATEGY` | backend | no | no | `none` | `native` | Set to native only when the API is reachable exclusively through a trusted reverse proxy, so X-Forwarded-For gives the real client IP for audit and rate limiting. |
| `LOGGING_STRUCTURED_FORMAT_CONSOLE` | backend | no | no | `ecs` | - | Spring Boot structured logging format for console output (ecs recommended in production; empty = human-readable). |



### 4.4 `.env.example` (repository root, used by Docker Compose)

# .env.example - copy to .env for local development. NEVER commit .env.
# Values below are for local development only.

# ---- backend ----
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
DB_URL=jdbc:postgresql://db:5432/dms
DB_USERNAME=dms
DB_PASSWORD=dms_dev_password
DB_MIGRATION_USERNAME=${DB_USERNAME}
DB_MIGRATION_PASSWORD=
DB_POOL_MAX_SIZE=10
APP_JWT_SECRET=ZGV2LW9ubHktc2VjcmV0LWNoYW5nZS1tZS0wMTIzNDU2Nzg5YWJjZGVm
APP_JWT_ISSUER=dms-api
APP_JWT_ACCESS_TOKEN_TTL=PT15M
APP_JWT_REFRESH_TOKEN_TTL=PT12H
APP_REFRESH_COOKIE_SECURE=false
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000
APP_TIMEZONE=Asia/Colombo
APP_BOOTSTRAP_ADMIN_USERNAME=
APP_BOOTSTRAP_ADMIN_PASSWORD=
APP_SWAGGER_ENABLED=true
APP_RATE_LIMIT_LOGIN_PER_MINUTE=10
APP_RATE_LIMIT_PUBLIC_PER_MINUTE=600
APP_RETENTION_QUEUE_PII_DAYS=90
SERVER_FORWARD_HEADERS_STRATEGY=native
LOGGING_STRUCTURED_FORMAT_CONSOLE=ecs

# ---- frontend ----
API_PROXY_TARGET=http://localhost:8080
NEXT_PUBLIC_API_BASE_PATH=/api/v1
NEXT_PUBLIC_APP_NAME=DMS (dev)
NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS=5000
NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS=10000
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=30

# ---- database ----
POSTGRES_DB=dms
POSTGRES_USER=dms
POSTGRES_PASSWORD=dms_dev_password


The values are for local development only. `.env` is listed in `.gitignore`. For running the backend on the host (outside Compose)
use `DB_URL=jdbc:postgresql://localhost:5432/dms`.

## 5. Docker

### 5.1 `backend/Dockerfile`

```dockerfile
# build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY src/ src/
RUN ./mvnw -q -B -DskipTests package && java -Djarmode=tools -jar target/dms-backend.jar extract --layers --launcher --destination target/extracted

# runtime stage
FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/* \
 && groupadd --system dms && useradd --system --gid dms --no-create-home dms
WORKDIR /app
COPY --from=build /src/target/extracted/dependencies/ ./
COPY --from=build /src/target/extracted/spring-boot-loader/ ./
COPY --from=build /src/target/extracted/snapshot-dependencies/ ./
COPY --from=build /src/target/extracted/application/ ./
USER dms
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=UTC"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Set `<finalName>dms-backend</finalName>` in the POM. The JVM runs in UTC; business dates use `APP_TIMEZONE` through `BusinessClock`.

### 5.2 `docker-compose.yml` (repository root)

```yaml
# docker-compose.yml - LOCAL DEVELOPMENT ONLY (repository root)
# Usage: cp .env.example .env && docker compose up --build
name: dms
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"            # remove in shared environments
    volumes:
      - dms-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 20

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE}
      SERVER_PORT: ${SERVER_PORT}
      DB_URL: ${DB_URL}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_POOL_MAX_SIZE: ${DB_POOL_MAX_SIZE}
      APP_JWT_SECRET: ${APP_JWT_SECRET}
      APP_JWT_ISSUER: ${APP_JWT_ISSUER}
      APP_JWT_ACCESS_TOKEN_TTL: ${APP_JWT_ACCESS_TOKEN_TTL}
      APP_JWT_REFRESH_TOKEN_TTL: ${APP_JWT_REFRESH_TOKEN_TTL}
      APP_REFRESH_COOKIE_SECURE: ${APP_REFRESH_COOKIE_SECURE}
      APP_CORS_ALLOWED_ORIGINS: ${APP_CORS_ALLOWED_ORIGINS}
      APP_TIMEZONE: ${APP_TIMEZONE}
      APP_SWAGGER_ENABLED: ${APP_SWAGGER_ENABLED}
      APP_RATE_LIMIT_LOGIN_PER_MINUTE: ${APP_RATE_LIMIT_LOGIN_PER_MINUTE}
      APP_RATE_LIMIT_PUBLIC_PER_MINUTE: ${APP_RATE_LIMIT_PUBLIC_PER_MINUTE}
      APP_RETENTION_QUEUE_PII_DAYS: ${APP_RETENTION_QUEUE_PII_DAYS}
      SERVER_FORWARD_HEADERS_STRATEGY: ${SERVER_FORWARD_HEADERS_STRATEGY}
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health/readiness || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 30

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE_PATH: ${NEXT_PUBLIC_API_BASE_PATH}
        NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME}
        NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS: ${NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS}
        NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS: ${NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS}
        NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: ${NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES}
    depends_on:
      backend:
        condition: service_healthy
    environment:
      API_PROXY_TARGET: http://backend:8080   # server-side only; overrides the host value in .env
    ports:
      - "3000:3000"

volumes:
  dms-pgdata:
```


## 6. Database implementation

### 6.1 Flyway migration (copy verbatim)

`src/main/resources/db/migration/V1__initial_schema.sql`:

```sql
-- =====================================================================
-- Dispensary Management System (DMS) - initial schema
-- Flyway migration: V1__initial_schema.sql
-- Target: PostgreSQL 16+ (works on 14+)
-- Conventions:
--   * Primary keys are UUID (gen_random_uuid(), core since PG 13).
--     The application normally generates the UUID; the DB default
--     exists for seed scripts and manual inserts.
--   * All instants are TIMESTAMPTZ and stored in UTC.
--   * Business dates (session_date, date_of_birth) are DATE and are
--     interpreted in the dispensary time zone (APP_TIMEZONE).
--   * Enumerations are VARCHAR + CHECK constraints (not PG ENUM types)
--     so new values can be added with a simple constraint change.
--   * Constraint and index names are stable: the backend maps unique
--     constraint names to API error codes (see ErrorCode catalogue).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- users: staff accounts (doctors, pharmacists, administrators)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                               UUID         NOT NULL DEFAULT gen_random_uuid(),
    username                         VARCHAR(50)  NOT NULL,
    password_hash                    VARCHAR(255) NOT NULL,
    full_name                        VARCHAR(150) NOT NULL,
    professional_registration_number VARCHAR(50),
    enabled                          BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password             BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_login_count               INTEGER      NOT NULL DEFAULT 0,
    locked_until                     TIMESTAMPTZ,
    last_login_at                    TIMESTAMPTZ,
    password_changed_at              TIMESTAMPTZ,
    created_at                       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by                       UUID,
    updated_at                       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version                          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT ck_users_username_format CHECK (username ~ '^[a-z0-9._-]{3,50}$'),
    CONSTRAINT ck_users_full_name_not_blank CHECK (btrim(full_name) <> ''),
    CONSTRAINT ck_users_failed_login_count CHECK (failed_login_count >= 0),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users (id)
);
COMMENT ON TABLE users IS 'Staff accounts that can authenticate. Users are never hard-deleted; they are disabled (enabled = false) so that historical references stay valid.';
COMMENT ON COLUMN users.id IS 'Surrogate key (UUID).';
COMMENT ON COLUMN users.username IS 'Login name, stored lower-case. Pattern ^[a-z0-9._-]{3,50}$.';
COMMENT ON COLUMN users.password_hash IS 'Spring Security DelegatingPasswordEncoder value, e.g. {bcrypt}$2b$12$... Never returned by the API.';
COMMENT ON COLUMN users.full_name IS 'Display name shown on prescriptions and audit views.';
COMMENT ON COLUMN users.professional_registration_number IS 'Optional professional registration number (e.g. medical council or pharmacy council number).';
COMMENT ON COLUMN users.enabled IS 'FALSE = account disabled; login and token refresh are refused.';
COMMENT ON COLUMN users.must_change_password IS 'TRUE after account creation or admin password reset; all endpoints except auth/me, auth/change-password and auth/logout return 403 PASSWORD_CHANGE_REQUIRED.';
COMMENT ON COLUMN users.failed_login_count IS 'Consecutive failed logins; reset to 0 on success.';
COMMENT ON COLUMN users.locked_until IS 'Login refused until this instant (set after 5 consecutive failures, 15 minutes).';
COMMENT ON COLUMN users.last_login_at IS 'Instant of the last successful login.';
COMMENT ON COLUMN users.password_changed_at IS 'Instant the password was last set by the user.';
COMMENT ON COLUMN users.created_at IS 'Creation instant (UTC).';
COMMENT ON COLUMN users.created_by IS 'Admin who created the account; NULL for the bootstrap admin.';
COMMENT ON COLUMN users.updated_at IS 'Last modification instant (UTC).';
COMMENT ON COLUMN users.version IS 'Optimistic-locking version (JPA @Version).';

-- ---------------------------------------------------------------------
-- user_roles: roles granted to a user (a user may hold several roles)
-- ---------------------------------------------------------------------
CREATE TABLE user_roles (
    user_id UUID        NOT NULL,
    role    VARCHAR(20) NOT NULL,
    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role),
    CONSTRAINT ck_user_roles_role CHECK (role IN ('ADMIN', 'DOCTOR', 'PHARMACIST')),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
COMMENT ON TABLE user_roles IS 'Role grants. Roles are a fixed code-level enumeration, so no separate roles table is needed.';
COMMENT ON COLUMN user_roles.user_id IS 'Granted user.';
COMMENT ON COLUMN user_roles.role IS 'ADMIN | DOCTOR | PHARMACIST.';
CREATE INDEX ix_user_roles_role ON user_roles (role);

-- ---------------------------------------------------------------------
-- refresh_tokens: server-side record of issued refresh tokens
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    family_id         UUID         NOT NULL,
    token_hash        CHAR(64)     NOT NULL,
    issued_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ  NOT NULL,
    rotated_at        TIMESTAMPTZ,
    replaced_by_id    UUID,
    revoked_at        TIMESTAMPTZ,
    revoke_reason     VARCHAR(30),
    created_ip        INET,
    user_agent        VARCHAR(255),
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_refresh_tokens_hash_hex CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_refresh_tokens_expiry CHECK (expires_at > issued_at),
    CONSTRAINT ck_refresh_tokens_revoke_reason CHECK (
        revoke_reason IS NULL OR revoke_reason IN
        ('LOGOUT', 'REUSE_DETECTED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'USER_DISABLED')),
    CONSTRAINT ck_refresh_tokens_revoked_consistency CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL)),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_id) REFERENCES refresh_tokens (id)
);
COMMENT ON TABLE refresh_tokens IS 'Opaque refresh tokens (only the SHA-256 hash is stored). Rotated on every use; reuse of a rotated token outside the grace window revokes the whole family.';
COMMENT ON COLUMN refresh_tokens.family_id IS 'All tokens descending from one login share a family; the family expires APP_JWT_REFRESH_TOKEN_TTL after login.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Lower-case hex SHA-256 of the raw token. The raw token exists only in the HttpOnly cookie.';
COMMENT ON COLUMN refresh_tokens.issued_at IS 'Issue instant.';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Absolute expiry; equals the family expiry (login instant + refresh TTL).';
COMMENT ON COLUMN refresh_tokens.rotated_at IS 'Set when the token was exchanged for a successor.';
COMMENT ON COLUMN refresh_tokens.replaced_by_id IS 'Successor token after rotation.';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Set when revoked; revoked tokens are never accepted.';
COMMENT ON COLUMN refresh_tokens.revoke_reason IS 'LOGOUT | REUSE_DETECTED | PASSWORD_CHANGED | PASSWORD_RESET | USER_DISABLED.';
COMMENT ON COLUMN refresh_tokens.created_ip IS 'Client IP at issue (for security investigation).';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Truncated User-Agent at issue.';
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX ix_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- ---------------------------------------------------------------------
-- patients: demographic master record
-- ---------------------------------------------------------------------
CREATE TABLE patients (
    id                      UUID          NOT NULL DEFAULT gen_random_uuid(),
    patient_number          VARCHAR(20)   NOT NULL,
    full_name               VARCHAR(150)  NOT NULL,
    sex                     VARCHAR(10)   NOT NULL,
    date_of_birth           DATE          NOT NULL,
    date_of_birth_estimated BOOLEAN       NOT NULL DEFAULT FALSE,
    phone_number            VARCHAR(16),
    address                 VARCHAR(300),
    known_allergies         VARCHAR(1000),
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by              UUID          NOT NULL,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by              UUID          NOT NULL,
    version                 BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT pk_patients PRIMARY KEY (id),
    CONSTRAINT uq_patients_patient_number UNIQUE (patient_number),
    CONSTRAINT ck_patients_patient_number_format CHECK (patient_number ~ '^[A-Z0-9][A-Z0-9-]{2,19}$'),
    CONSTRAINT ck_patients_full_name_not_blank CHECK (btrim(full_name) <> ''),
    CONSTRAINT ck_patients_sex CHECK (sex IN ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN')),
    CONSTRAINT ck_patients_dob_min CHECK (date_of_birth >= DATE '1900-01-01'),
    CONSTRAINT ck_patients_phone_format CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9]{7,15}$'),
    CONSTRAINT fk_patients_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_patients_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);
COMMENT ON TABLE patients IS 'One row per patient. Clinical history is NOT stored here; it is the set of consultations that reference the patient.';
COMMENT ON COLUMN patients.patient_number IS 'Business identifier printed on the clinic card; entered by staff, normalised to upper case, immutable after registration.';
COMMENT ON COLUMN patients.full_name IS 'Patient full name.';
COMMENT ON COLUMN patients.sex IS 'MALE | FEMALE | OTHER | UNKNOWN.';
COMMENT ON COLUMN patients.date_of_birth IS 'Exact DOB, or a DOB derived from an estimated age (see date_of_birth_estimated). Age is always computed, never stored.';
COMMENT ON COLUMN patients.date_of_birth_estimated IS 'TRUE when the DOB was derived from an estimated age because the real DOB is unknown.';
COMMENT ON COLUMN patients.phone_number IS 'Optional contact number, digits with optional leading +, 7-15 digits.';
COMMENT ON COLUMN patients.address IS 'Optional postal address.';
COMMENT ON COLUMN patients.known_allergies IS 'Clinician-entered allergy statement shown to doctors and pharmacists. Changes are audited.';
COMMENT ON COLUMN patients.created_by IS 'Doctor who registered the patient.';
COMMENT ON COLUMN patients.updated_by IS 'Last user who changed demographics.';
COMMENT ON COLUMN patients.version IS 'Optimistic-locking version; PUT requests must send the current value.';
CREATE INDEX ix_patients_full_name_trgm ON patients USING gin (full_name gin_trgm_ops);
CREATE INDEX ix_patients_phone_number ON patients (phone_number) WHERE phone_number IS NOT NULL;

-- ---------------------------------------------------------------------
-- queue_sessions: one numbered queue (e.g. a doctor's clinic on a date)
-- ---------------------------------------------------------------------
CREATE TABLE queue_sessions (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    session_date        DATE         NOT NULL,
    name                VARCHAR(100) NOT NULL,
    assigned_doctor_id  UUID,
    status              VARCHAR(12)  NOT NULL DEFAULT 'SCHEDULED',
    last_issued_number  INTEGER      NOT NULL DEFAULT 0,
    last_called_number  INTEGER,
    opened_at           TIMESTAMPTZ,
    opened_by           UUID,
    closed_at           TIMESTAMPTZ,
    closed_by           UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          UUID         NOT NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_queue_sessions PRIMARY KEY (id),
    CONSTRAINT ck_queue_sessions_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_queue_sessions_status CHECK (status IN ('SCHEDULED', 'OPEN', 'CLOSED')),
    CONSTRAINT ck_queue_sessions_last_issued CHECK (last_issued_number BETWEEN 0 AND 999),
    CONSTRAINT ck_queue_sessions_last_called CHECK (
        last_called_number IS NULL OR (last_called_number BETWEEN 1 AND last_issued_number)),
    CONSTRAINT ck_queue_sessions_status_timestamps CHECK (
        (status = 'SCHEDULED' AND opened_at IS NULL AND closed_at IS NULL)
     OR (status = 'OPEN'      AND opened_at IS NOT NULL AND closed_at IS NULL)
     OR (status = 'CLOSED'    AND closed_at IS NOT NULL)),
    CONSTRAINT fk_queue_sessions_doctor FOREIGN KEY (assigned_doctor_id) REFERENCES users (id),
    CONSTRAINT fk_queue_sessions_opened_by FOREIGN KEY (opened_by) REFERENCES users (id),
    CONSTRAINT fk_queue_sessions_closed_by FOREIGN KEY (closed_by) REFERENCES users (id),
    CONSTRAINT fk_queue_sessions_created_by FOREIGN KEY (created_by) REFERENCES users (id)
);
COMMENT ON TABLE queue_sessions IS 'A queue with its own number sequence. Numbering restarts at 1 for every session; sessions are per date, so numbering restarts at least daily.';
COMMENT ON COLUMN queue_sessions.session_date IS 'Business date of the session in APP_TIMEZONE.';
COMMENT ON COLUMN queue_sessions.name IS 'Display label, e.g. "Morning OPD - Room 1". Unique per date (case-insensitive).';
COMMENT ON COLUMN queue_sessions.assigned_doctor_id IS 'Optional doctor who normally serves this queue (informational; any doctor may call).';
COMMENT ON COLUMN queue_sessions.status IS 'SCHEDULED (bookings allowed, no calls) | OPEN (bookings and calls) | CLOSED (terminal).';
COMMENT ON COLUMN queue_sessions.last_issued_number IS 'Counter of issued queue numbers. Incremented under a row lock in the same transaction that inserts the queue entry, so numbers are unique and gap-free.';
COMMENT ON COLUMN queue_sessions.last_called_number IS 'Number most recently called (the public "now serving" number). Used as the compare-and-set token for call-next.';
COMMENT ON COLUMN queue_sessions.opened_at IS 'Instant the session was opened.';
COMMENT ON COLUMN queue_sessions.closed_at IS 'Instant the session was closed.';
COMMENT ON COLUMN queue_sessions.version IS 'Incremented on every queue mutation (booking, call, complete, skip, cancel, requeue); exposed as the public ETag.';
CREATE UNIQUE INDEX uq_queue_sessions_date_name ON queue_sessions (session_date, lower(name));
CREATE INDEX ix_queue_sessions_date_status ON queue_sessions (session_date, status);

-- ---------------------------------------------------------------------
-- queue_entries: a booking / position in a queue session
-- ---------------------------------------------------------------------
CREATE TABLE queue_entries (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    queue_session_id  UUID         NOT NULL,
    queue_number      INTEGER      NOT NULL,
    status            VARCHAR(12)  NOT NULL DEFAULT 'WAITING',
    channel           VARCHAR(10)  NOT NULL,
    patient_name      VARCHAR(150),
    contact_phone     VARCHAR(16),
    notes             VARCHAR(300),
    booked_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    booked_by         UUID         NOT NULL,
    called_at         TIMESTAMPTZ,
    called_by         UUID,
    completed_at      TIMESTAMPTZ,
    completed_by      UUID,
    skipped_at        TIMESTAMPTZ,
    skipped_by        UUID,
    skip_reason       VARCHAR(300),
    cancelled_at      TIMESTAMPTZ,
    cancelled_by      UUID,
    cancel_reason     VARCHAR(500),
    requeue_count     SMALLINT     NOT NULL DEFAULT 0,
    anonymized_at     TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version           BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_queue_entries PRIMARY KEY (id),
    CONSTRAINT uq_queue_entries_session_number UNIQUE (queue_session_id, queue_number),
    CONSTRAINT ck_queue_entries_number CHECK (queue_number BETWEEN 1 AND 999),
    CONSTRAINT ck_queue_entries_status CHECK (status IN ('WAITING', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
    CONSTRAINT ck_queue_entries_channel CHECK (channel IN ('PHONE', 'WALK_IN')),
    CONSTRAINT ck_queue_entries_name_present CHECK (patient_name IS NOT NULL OR anonymized_at IS NOT NULL),
    CONSTRAINT ck_queue_entries_phone_format CHECK (contact_phone IS NULL OR contact_phone ~ '^\+?[0-9]{7,15}$'),
    CONSTRAINT ck_queue_entries_requeue_count CHECK (requeue_count >= 0),
    CONSTRAINT ck_queue_entries_status_timestamps CHECK (
        (status <> 'SERVING'   OR called_at IS NOT NULL)
    AND (status <> 'COMPLETED' OR completed_at IS NOT NULL)
    AND (status <> 'SKIPPED'   OR skipped_at IS NOT NULL)
    AND (status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL))),
    CONSTRAINT fk_queue_entries_session FOREIGN KEY (queue_session_id) REFERENCES queue_sessions (id),
    CONSTRAINT fk_queue_entries_booked_by FOREIGN KEY (booked_by) REFERENCES users (id),
    CONSTRAINT fk_queue_entries_called_by FOREIGN KEY (called_by) REFERENCES users (id),
    CONSTRAINT fk_queue_entries_completed_by FOREIGN KEY (completed_by) REFERENCES users (id),
    CONSTRAINT fk_queue_entries_skipped_by FOREIGN KEY (skipped_by) REFERENCES users (id),
    CONSTRAINT fk_queue_entries_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id)
);
COMMENT ON TABLE queue_entries IS 'A booking. Creating a booking (telephone or walk-in) creates exactly one queue entry, so bookings and queue entries share one table.';
COMMENT ON COLUMN queue_entries.queue_session_id IS 'Session the entry belongs to.';
COMMENT ON COLUMN queue_entries.queue_number IS 'Number given to the patient; unique and gap-free within the session, never reused.';
COMMENT ON COLUMN queue_entries.status IS 'WAITING | SERVING | COMPLETED | SKIPPED | CANCELLED (queue lifecycle, distinct from prescription statuses).';
COMMENT ON COLUMN queue_entries.channel IS 'PHONE (telephone booking) | WALK_IN.';
COMMENT ON COLUMN queue_entries.patient_name IS 'Name given by the caller. Staff-only; never exposed publicly. Set to NULL by the retention job (anonymized_at).';
COMMENT ON COLUMN queue_entries.contact_phone IS 'Optional callback number. Staff-only; used for duplicate-booking detection. Cleared by the retention job.';
COMMENT ON COLUMN queue_entries.notes IS 'Short non-clinical booking note (e.g. "elderly, needs wheelchair"). Cleared by the retention job.';
COMMENT ON COLUMN queue_entries.booked_by IS 'Staff member who registered the booking.';
COMMENT ON COLUMN queue_entries.called_at IS 'Last time the entry was called (moved to SERVING).';
COMMENT ON COLUMN queue_entries.requeue_count IS 'Number of times a skipped entry was returned to WAITING.';
COMMENT ON COLUMN queue_entries.anonymized_at IS 'Set when the retention job removed name, phone and notes.';
COMMENT ON COLUMN queue_entries.version IS 'Optimistic-locking version.';
CREATE INDEX ix_queue_entries_session_status_number ON queue_entries (queue_session_id, status, queue_number);
CREATE INDEX ix_queue_entries_active_phone ON queue_entries (queue_session_id, contact_phone)
    WHERE status IN ('WAITING', 'SERVING') AND contact_phone IS NOT NULL;
CREATE INDEX ix_queue_entries_booked_at ON queue_entries (booked_at) WHERE anonymized_at IS NULL;

-- ---------------------------------------------------------------------
-- consultations: one doctor-patient encounter (immutable once created)
-- ---------------------------------------------------------------------
CREATE TABLE consultations (
    id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    patient_id            UUID          NOT NULL,
    doctor_id             UUID          NOT NULL,
    queue_entry_id        UUID,
    consultation_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    presenting_complaint  VARCHAR(1000),
    clinical_notes        VARCHAR(5000),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_consultations PRIMARY KEY (id),
    CONSTRAINT uq_consultations_id_patient UNIQUE (id, patient_id),
    CONSTRAINT uq_consultations_queue_entry UNIQUE (queue_entry_id),
    CONSTRAINT fk_consultations_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
    CONSTRAINT fk_consultations_doctor FOREIGN KEY (doctor_id) REFERENCES users (id),
    CONSTRAINT fk_consultations_queue_entry FOREIGN KEY (queue_entry_id) REFERENCES queue_entries (id)
);
COMMENT ON TABLE consultations IS 'Medical history is the ordered set of consultations of a patient. Rows are insert-only: no UPDATE or DELETE paths exist in v1.';
COMMENT ON COLUMN consultations.patient_id IS 'Patient seen.';
COMMENT ON COLUMN consultations.doctor_id IS 'Doctor who recorded the consultation (the authenticated user).';
COMMENT ON COLUMN consultations.queue_entry_id IS 'Optional link to the queue entry that was being served; at most one consultation per entry.';
COMMENT ON COLUMN consultations.consultation_at IS 'Instant the consultation was submitted (server clock).';
COMMENT ON COLUMN consultations.presenting_complaint IS 'Optional presenting complaint / reason for visit.';
COMMENT ON COLUMN consultations.clinical_notes IS 'Optional clinical notes. Sensitive: never logged, never shown to pharmacists.';
COMMENT ON COLUMN consultations.created_at IS 'Row creation instant.';
CREATE INDEX ix_consultations_patient_at ON consultations (patient_id, consultation_at DESC);
CREATE INDEX ix_consultations_doctor_at ON consultations (doctor_id, consultation_at DESC);

-- ---------------------------------------------------------------------
-- consultation_diagnoses: conditions / diagnoses recorded per consultation
-- ---------------------------------------------------------------------
CREATE TABLE consultation_diagnoses (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    consultation_id  UUID         NOT NULL,
    line_number      SMALLINT     NOT NULL,
    condition_text   VARCHAR(500) NOT NULL,
    icd10_code       VARCHAR(10),
    CONSTRAINT pk_consultation_diagnoses PRIMARY KEY (id),
    CONSTRAINT uq_consultation_diagnoses_line UNIQUE (consultation_id, line_number),
    CONSTRAINT ck_consultation_diagnoses_line CHECK (line_number BETWEEN 1 AND 10),
    CONSTRAINT ck_consultation_diagnoses_text_not_blank CHECK (btrim(condition_text) <> ''),
    CONSTRAINT ck_consultation_diagnoses_icd10 CHECK (icd10_code IS NULL OR icd10_code ~ '^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$'),
    CONSTRAINT fk_consultation_diagnoses_consultation FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);
COMMENT ON TABLE consultation_diagnoses IS 'One row per condition/diagnosis recorded in a consultation (1-10 per consultation). "Previous medical conditions" are derived from these rows.';
COMMENT ON COLUMN consultation_diagnoses.line_number IS 'Order within the consultation, 1 = primary.';
COMMENT ON COLUMN consultation_diagnoses.condition_text IS 'Clinician-entered condition or diagnosis text.';
COMMENT ON COLUMN consultation_diagnoses.icd10_code IS 'Optional ICD-10 code entered by the doctor (format-checked only; no code catalogue in v1).';

-- ---------------------------------------------------------------------
-- medicines: lightweight medicine catalogue (no stock / inventory)
-- ---------------------------------------------------------------------
CREATE TABLE medicines (
    id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    name         VARCHAR(200) NOT NULL,
    strength     VARCHAR(50),
    dosage_form  VARCHAR(20)  NOT NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by   UUID         NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by   UUID         NOT NULL,
    version      BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_medicines PRIMARY KEY (id),
    CONSTRAINT ck_medicines_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_medicines_dosage_form CHECK (dosage_form IN (
        'TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'SOLUTION', 'INJECTION', 'CREAM', 'OINTMENT',
        'GEL', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'PATCH', 'OTHER')),
    CONSTRAINT fk_medicines_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_medicines_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);
COMMENT ON TABLE medicines IS 'Optional catalogue used for prescription autocomplete and to block discontinued (inactive) medicines. Contains no stock levels: inventory is out of scope for v1.';
COMMENT ON COLUMN medicines.name IS 'Generic (or brand) name, e.g. "Paracetamol".';
COMMENT ON COLUMN medicines.strength IS 'Optional strength, e.g. "500 mg" or "125 mg/5 ml".';
COMMENT ON COLUMN medicines.dosage_form IS 'Dosage form enumeration.';
COMMENT ON COLUMN medicines.active IS 'FALSE = discontinued/unavailable; cannot be prescribed by medicineId (422 MEDICINE_INACTIVE).';
CREATE UNIQUE INDEX uq_medicines_name_strength_form ON medicines (lower(name), lower(coalesce(strength, '')), dosage_form);
CREATE INDEX ix_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- prescriptions: medicine order produced by a consultation
-- ---------------------------------------------------------------------
CREATE SEQUENCE prescription_number_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

CREATE TABLE prescriptions (
    id                         UUID          NOT NULL DEFAULT gen_random_uuid(),
    prescription_number        BIGINT        NOT NULL DEFAULT nextval('prescription_number_seq'),
    consultation_id            UUID          NOT NULL,
    patient_id                 UUID          NOT NULL,
    status                     VARCHAR(12)   NOT NULL DEFAULT 'PENDING',
    notes                      VARCHAR(1000),
    submitted_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    started_at                 TIMESTAMPTZ,
    started_by                 UUID,
    cancelled_at               TIMESTAMPTZ,
    cancelled_by               UUID,
    cancel_reason              VARCHAR(500),
    supersedes_prescription_id UUID,
    updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version                    BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT pk_prescriptions PRIMARY KEY (id),
    CONSTRAINT uq_prescriptions_number UNIQUE (prescription_number),
    CONSTRAINT uq_prescriptions_supersedes UNIQUE (supersedes_prescription_id),
    CONSTRAINT ck_prescriptions_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DISPENSED', 'CANCELLED')),
    CONSTRAINT ck_prescriptions_status_fields CHECK (
        (status <> 'IN_PROGRESS' OR started_at IS NOT NULL)
    AND (status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL))
    AND (status = 'CANCELLED' OR cancelled_at IS NULL)),
    CONSTRAINT ck_prescriptions_not_self_superseding CHECK (supersedes_prescription_id IS NULL OR supersedes_prescription_id <> id),
    CONSTRAINT fk_prescriptions_consultation_patient FOREIGN KEY (consultation_id, patient_id)
        REFERENCES consultations (id, patient_id),
    CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
    CONSTRAINT fk_prescriptions_started_by FOREIGN KEY (started_by) REFERENCES users (id),
    CONSTRAINT fk_prescriptions_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id),
    CONSTRAINT fk_prescriptions_supersedes FOREIGN KEY (supersedes_prescription_id) REFERENCES prescriptions (id)
);
COMMENT ON TABLE prescriptions IS 'Prescription header. Lifecycle PENDING -> IN_PROGRESS -> DISPENSED, with CANCELLED from PENDING/IN_PROGRESS. DISPENSED and CANCELLED are terminal.';
COMMENT ON COLUMN prescriptions.prescription_number IS 'Human-readable sequential number, shown as RX-000123 (format RX-%06d). Gaps are possible and harmless.';
COMMENT ON COLUMN prescriptions.consultation_id IS 'Consultation that produced the prescription. The prescriber is consultations.doctor_id.';
COMMENT ON COLUMN prescriptions.patient_id IS 'Deliberate denormalisation for the pharmacist queue; kept consistent with the consultation by a composite foreign key.';
COMMENT ON COLUMN prescriptions.status IS 'PENDING | IN_PROGRESS | DISPENSED | CANCELLED.';
COMMENT ON COLUMN prescriptions.notes IS 'Optional note from doctor to pharmacist.';
COMMENT ON COLUMN prescriptions.submitted_at IS 'Instant the prescription entered the pharmacist queue.';
COMMENT ON COLUMN prescriptions.started_at IS 'Instant a pharmacist marked it IN_PROGRESS.';
COMMENT ON COLUMN prescriptions.started_by IS 'Pharmacist who marked it IN_PROGRESS.';
COMMENT ON COLUMN prescriptions.cancelled_at IS 'Cancellation instant.';
COMMENT ON COLUMN prescriptions.cancelled_by IS 'Doctor (prescriber) or pharmacist who cancelled.';
COMMENT ON COLUMN prescriptions.cancel_reason IS 'Mandatory reason for cancellation.';
COMMENT ON COLUMN prescriptions.supersedes_prescription_id IS 'Cancelled prescription that this one replaces (re-issue); each prescription can be superseded at most once.';
COMMENT ON COLUMN prescriptions.version IS 'Optimistic-locking version.';
CREATE UNIQUE INDEX uq_prescriptions_active_per_consultation ON prescriptions (consultation_id) WHERE status <> 'CANCELLED';
CREATE INDEX ix_prescriptions_status_submitted ON prescriptions (status, submitted_at);
CREATE INDEX ix_prescriptions_patient_submitted ON prescriptions (patient_id, submitted_at DESC);
CREATE INDEX ix_prescriptions_consultation ON prescriptions (consultation_id);

-- ---------------------------------------------------------------------
-- prescription_items: what the doctor prescribed (immutable)
-- ---------------------------------------------------------------------
CREATE TABLE prescription_items (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    prescription_id  UUID          NOT NULL,
    line_number      SMALLINT      NOT NULL,
    medicine_id      UUID,
    medicine_name    VARCHAR(200)  NOT NULL,
    strength         VARCHAR(50),
    dosage_form      VARCHAR(20),
    dose             VARCHAR(100)  NOT NULL,
    frequency        VARCHAR(100)  NOT NULL,
    duration_days    SMALLINT,
    quantity         NUMERIC(7, 2) NOT NULL,
    quantity_unit    VARCHAR(30)   NOT NULL,
    instructions     VARCHAR(500),
    CONSTRAINT pk_prescription_items PRIMARY KEY (id),
    CONSTRAINT uq_prescription_items_line UNIQUE (prescription_id, line_number),
    CONSTRAINT uq_prescription_items_id_prescription UNIQUE (id, prescription_id),
    CONSTRAINT ck_prescription_items_line CHECK (line_number BETWEEN 1 AND 30),
    CONSTRAINT ck_prescription_items_name_not_blank CHECK (btrim(medicine_name) <> ''),
    CONSTRAINT ck_prescription_items_dosage_form CHECK (dosage_form IS NULL OR dosage_form IN (
        'TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'SOLUTION', 'INJECTION', 'CREAM', 'OINTMENT',
        'GEL', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'PATCH', 'OTHER')),
    CONSTRAINT ck_prescription_items_duration CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 365),
    CONSTRAINT ck_prescription_items_quantity CHECK (quantity > 0),
    CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
    CONSTRAINT fk_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines (id)
);
COMMENT ON TABLE prescription_items IS 'Prescribed lines (1-30 per prescription). medicine_name/strength/dosage_form are snapshots so history is unchanged if the catalogue is edited later.';
COMMENT ON COLUMN prescription_items.line_number IS 'Order within the prescription.';
COMMENT ON COLUMN prescription_items.medicine_id IS 'Catalogue medicine, or NULL for a free-text medicine.';
COMMENT ON COLUMN prescription_items.medicine_name IS 'Snapshot of the medicine name at prescribing time.';
COMMENT ON COLUMN prescription_items.strength IS 'Snapshot of strength, e.g. "500 mg".';
COMMENT ON COLUMN prescription_items.dosage_form IS 'Snapshot of dosage form.';
COMMENT ON COLUMN prescription_items.dose IS 'Dose per administration, free text, e.g. "1 tablet", "5 ml".';
COMMENT ON COLUMN prescription_items.frequency IS 'Frequency, free text, e.g. "3 times daily (TDS)".';
COMMENT ON COLUMN prescription_items.duration_days IS 'Duration in days (1-365); NULL = as directed / as needed.';
COMMENT ON COLUMN prescription_items.quantity IS 'Total quantity to dispense (BigDecimal, max 2 decimals).';
COMMENT ON COLUMN prescription_items.quantity_unit IS 'Unit of quantity, e.g. "tablets", "ml", "bottles".';
COMMENT ON COLUMN prescription_items.instructions IS 'Optional patient instructions, e.g. "after meals".';

-- ---------------------------------------------------------------------
-- dispensings: the single dispensing event of a prescription
-- ---------------------------------------------------------------------
CREATE TABLE dispensings (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    prescription_id  UUID          NOT NULL,
    pharmacist_id    UUID          NOT NULL,
    dispensed_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    outcome          VARCHAR(10)   NOT NULL,
    notes            VARCHAR(1000),
    CONSTRAINT pk_dispensings PRIMARY KEY (id),
    CONSTRAINT uq_dispensings_prescription UNIQUE (prescription_id),
    CONSTRAINT uq_dispensings_id_prescription UNIQUE (id, prescription_id),
    CONSTRAINT ck_dispensings_outcome CHECK (outcome IN ('FULL', 'PARTIAL')),
    CONSTRAINT fk_dispensings_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
    CONSTRAINT fk_dispensings_pharmacist FOREIGN KEY (pharmacist_id) REFERENCES users (id)
);
COMMENT ON TABLE dispensings IS 'Who dispensed, when, and the overall outcome. UNIQUE(prescription_id) makes duplicate dispensing impossible at the database level.';
COMMENT ON COLUMN dispensings.pharmacist_id IS 'Authenticated pharmacist who confirmed dispensing.';
COMMENT ON COLUMN dispensings.dispensed_at IS 'Server instant of confirmation.';
COMMENT ON COLUMN dispensings.outcome IS 'FULL (every item fully dispensed) | PARTIAL (at least one item partial or not dispensed). Derived by the server.';
COMMENT ON COLUMN dispensings.notes IS 'Optional pharmacist note.';

-- ---------------------------------------------------------------------
-- dispensing_items: what was actually handed over, per prescribed line
-- ---------------------------------------------------------------------
CREATE TABLE dispensing_items (
    id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    dispensing_id         UUID          NOT NULL,
    prescription_id       UUID          NOT NULL,
    prescription_item_id  UUID          NOT NULL,
    quantity_dispensed    NUMERIC(7, 2) NOT NULL,
    status                VARCHAR(15)   NOT NULL,
    note                  VARCHAR(500),
    CONSTRAINT pk_dispensing_items PRIMARY KEY (id),
    CONSTRAINT uq_dispensing_items_item UNIQUE (prescription_item_id),
    CONSTRAINT ck_dispensing_items_quantity CHECK (quantity_dispensed >= 0),
    CONSTRAINT ck_dispensing_items_status CHECK (status IN ('FULL', 'PARTIAL', 'NOT_DISPENSED')),
    CONSTRAINT ck_dispensing_items_zero_iff_not_dispensed CHECK ((status = 'NOT_DISPENSED') = (quantity_dispensed = 0)),
    CONSTRAINT ck_dispensing_items_note_required CHECK (status = 'FULL' OR note IS NOT NULL),
    CONSTRAINT fk_dispensing_items_dispensing FOREIGN KEY (dispensing_id, prescription_id)
        REFERENCES dispensings (id, prescription_id),
    CONSTRAINT fk_dispensing_items_item FOREIGN KEY (prescription_item_id, prescription_id)
        REFERENCES prescription_items (id, prescription_id)
);
COMMENT ON TABLE dispensing_items IS 'One row per prescription item in the dispensing. Composite foreign keys guarantee the item belongs to the same prescription as the dispensing.';
COMMENT ON COLUMN dispensing_items.prescription_id IS 'Redundant copy used only by the composite foreign keys.';
COMMENT ON COLUMN dispensing_items.quantity_dispensed IS 'Quantity handed over (0 .. prescribed quantity, max 2 decimals).';
COMMENT ON COLUMN dispensing_items.status IS 'FULL | PARTIAL | NOT_DISPENSED, derived by the server from quantity_dispensed vs prescribed quantity.';
COMMENT ON COLUMN dispensing_items.note IS 'Mandatory when not FULL, e.g. "out of stock", "brand substituted".';
CREATE INDEX ix_dispensing_items_dispensing ON dispensing_items (dispensing_id);
CREATE INDEX ix_dispensings_pharmacist_at ON dispensings (pharmacist_id, dispensed_at DESC);

-- ---------------------------------------------------------------------
-- idempotency_keys: de-duplication of retried create requests
-- ---------------------------------------------------------------------
CREATE TABLE idempotency_keys (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL,
    idempotency_key  VARCHAR(100) NOT NULL,
    operation        VARCHAR(50)  NOT NULL,
    request_hash     CHAR(64)     NOT NULL,
    resource_id      UUID,
    response_status  SMALLINT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT pk_idempotency_keys PRIMARY KEY (id),
    CONSTRAINT uq_idempotency_keys_user_key UNIQUE (user_id, idempotency_key),
    CONSTRAINT ck_idempotency_keys_key_format CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{8,100}$'),
    CONSTRAINT ck_idempotency_keys_hash_hex CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT fk_idempotency_keys_user FOREIGN KEY (user_id) REFERENCES users (id)
);
COMMENT ON TABLE idempotency_keys IS 'Inserted in the SAME transaction as the business write. A concurrent duplicate blocks on the unique index until the first commits, then replays the stored resource. Stores ids only, never response bodies (no PHI copies).';
COMMENT ON COLUMN idempotency_keys.idempotency_key IS 'Client-supplied Idempotency-Key header (UUID recommended).';
COMMENT ON COLUMN idempotency_keys.operation IS 'Operation id, e.g. createConsultation. Same key with a different operation or body -> 422 IDEMPOTENCY_KEY_REUSED.';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'SHA-256 of operation + path + canonical JSON body.';
COMMENT ON COLUMN idempotency_keys.resource_id IS 'Id of the created resource, used to rebuild the response on replay.';
COMMENT ON COLUMN idempotency_keys.response_status IS 'HTTP status of the original response (201 or 200).';
COMMENT ON COLUMN idempotency_keys.expires_at IS 'created_at + 24 h; purged by the retention job.';
CREATE INDEX ix_idempotency_keys_expires_at ON idempotency_keys (expires_at);

-- ---------------------------------------------------------------------
-- audit_events: append-only security and clinical audit trail
-- ---------------------------------------------------------------------
CREATE TABLE audit_events (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor_user_id   UUID,
    actor_username  VARCHAR(50),
    action          VARCHAR(50)  NOT NULL,
    entity_type     VARCHAR(30)  NOT NULL,
    entity_id       UUID,
    patient_id      UUID,
    outcome         VARCHAR(10)  NOT NULL DEFAULT 'SUCCESS',
    details         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    request_id      VARCHAR(64),
    ip_address      INET,
    user_agent      VARCHAR(255),
    CONSTRAINT pk_audit_events PRIMARY KEY (id),
    CONSTRAINT ck_audit_events_action_format CHECK (action ~ '^[A-Z][A-Z_]{2,49}$'),
    CONSTRAINT ck_audit_events_entity_type CHECK (entity_type IN (
        'USER', 'SESSION', 'PATIENT', 'CONSULTATION', 'PRESCRIPTION', 'MEDICINE',
        'QUEUE_SESSION', 'QUEUE_ENTRY', 'AUDIT')),
    CONSTRAINT ck_audit_events_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE', 'DENIED')),
    CONSTRAINT ck_audit_events_details_object CHECK (jsonb_typeof(details) = 'object'),
    CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_user_id) REFERENCES users (id),
    CONSTRAINT fk_audit_events_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);
COMMENT ON TABLE audit_events IS 'Append-only audit trail (UPDATE/DELETE blocked by trigger). details must never contain passwords, tokens, clinical notes or diagnoses.';
COMMENT ON COLUMN audit_events.occurred_at IS 'Event instant (UTC).';
COMMENT ON COLUMN audit_events.actor_user_id IS 'Authenticated user, NULL for anonymous events (e.g. failed login of unknown user).';
COMMENT ON COLUMN audit_events.actor_username IS 'Username snapshot (only for existing users).';
COMMENT ON COLUMN audit_events.action IS 'AuditAction enumeration value, e.g. PATIENT_HISTORY_VIEWED.';
COMMENT ON COLUMN audit_events.entity_type IS 'Type of the affected entity.';
COMMENT ON COLUMN audit_events.entity_id IS 'Id of the affected entity.';
COMMENT ON COLUMN audit_events.patient_id IS 'Patient whose data was touched; supports "who accessed this patient" reports.';
COMMENT ON COLUMN audit_events.outcome IS 'SUCCESS | FAILURE | DENIED.';
COMMENT ON COLUMN audit_events.details IS 'Small JSON object with non-sensitive context (e.g. {"fromStatus":"PENDING","toStatus":"DISPENSED"}).';
COMMENT ON COLUMN audit_events.request_id IS 'X-Request-Id correlating with application logs.';
COMMENT ON COLUMN audit_events.ip_address IS 'Client IP (from the trusted proxy).';
COMMENT ON COLUMN audit_events.user_agent IS 'Truncated User-Agent.';
CREATE INDEX ix_audit_events_occurred_at ON audit_events (occurred_at DESC);
CREATE INDEX ix_audit_events_patient ON audit_events (patient_id, occurred_at DESC) WHERE patient_id IS NOT NULL;
CREATE INDEX ix_audit_events_actor ON audit_events (actor_user_id, occurred_at DESC);
CREATE INDEX ix_audit_events_entity ON audit_events (entity_type, entity_id);

CREATE FUNCTION audit_events_block_modification() RETURNS trigger
    LANGUAGE plpgsql AS
$$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only (% blocked)', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER trg_audit_events_append_only
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_block_modification();
```


Never edit an applied migration; every later change is `V2__...`, `V3__...` (see 02-Database-and-System-Architecture.pdf section 8).

### 6.2 Development seed (copy verbatim, dev profile only)

`src/main/resources/db/seed/R__dev_seed.sql` - all users have the password `DevPassword#2026`:

```sql
-- =====================================================================
-- DEVELOPMENT SEED DATA ONLY - never deploy to production.
-- Flyway repeatable migration, location classpath:db/seed, which is
-- added to spring.flyway.locations ONLY in the "dev" profile.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
-- All dev users share the password  DevPassword#2026
-- =====================================================================

-- ---------- users ----------
INSERT INTO users (id, username, password_hash, full_name, professional_registration_number,
                   enabled, must_change_password, created_at, updated_at)
VALUES
 ('00000000-0000-4000-8000-000000000001', 'admin',
  '{bcrypt}$2b$12$VpsfzT1SzLJVRTehnxHfF.lFUgiUWaruMhfxLw2F3koKxXJ4jkeCC',
  'System Administrator', NULL, TRUE, FALSE, now(), now()),
 ('00000000-0000-4000-8000-000000000002', 'dr.perera',
  '{bcrypt}$2b$12$VpsfzT1SzLJVRTehnxHfF.lFUgiUWaruMhfxLw2F3koKxXJ4jkeCC',
  'Dr. Nimal Perera', 'MC-12345', TRUE, FALSE, now(), now()),
 ('00000000-0000-4000-8000-000000000003', 'dr.fernando',
  '{bcrypt}$2b$12$VpsfzT1SzLJVRTehnxHfF.lFUgiUWaruMhfxLw2F3koKxXJ4jkeCC',
  'Dr. Anusha Fernando', 'MC-23456', TRUE, FALSE, now(), now()),
 ('00000000-0000-4000-8000-000000000004', 'ph.silva',
  '{bcrypt}$2b$12$VpsfzT1SzLJVRTehnxHfF.lFUgiUWaruMhfxLw2F3koKxXJ4jkeCC',
  'Kamal Silva', 'PH-3456', TRUE, FALSE, now(), now()),
 ('00000000-0000-4000-8000-000000000005', 'dr.jayasinghe',
  '{bcrypt}$2b$12$VpsfzT1SzLJVRTehnxHfF.lFUgiUWaruMhfxLw2F3koKxXJ4jkeCC',
  'Dr. Ruwan Jayasinghe (doctor + pharmacist)', 'MC-34567', TRUE, FALSE, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role) VALUES
 ('00000000-0000-4000-8000-000000000001', 'ADMIN'),
 ('00000000-0000-4000-8000-000000000002', 'DOCTOR'),
 ('00000000-0000-4000-8000-000000000003', 'DOCTOR'),
 ('00000000-0000-4000-8000-000000000004', 'PHARMACIST'),
 ('00000000-0000-4000-8000-000000000005', 'DOCTOR'),
 ('00000000-0000-4000-8000-000000000005', 'PHARMACIST')
ON CONFLICT DO NOTHING;

-- ---------- medicines ----------
INSERT INTO medicines (id, name, strength, dosage_form, active, created_by, updated_by) VALUES
 ('10000000-0000-4000-8000-000000000001', 'Paracetamol',  '500 mg',       'TABLET',  TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000002', 'Paracetamol',  '120 mg/5 ml',  'SYRUP',   TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000003', 'Amoxicillin',  '500 mg',       'CAPSULE', TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000004', 'Amoxicillin',  '125 mg/5 ml',  'SUSPENSION', TRUE, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000005', 'Metformin',    '500 mg',       'TABLET',  TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000006', 'Amlodipine',   '5 mg',         'TABLET',  TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000007', 'Cetirizine',   '10 mg',        'TABLET',  TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000008', 'Omeprazole',   '20 mg',        'CAPSULE', TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000009', 'Salbutamol',   '100 mcg/dose', 'INHALER', TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000010', 'Oral rehydration salts', NULL, 'POWDER',  TRUE,  '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004'),
 ('10000000-0000-4000-8000-000000000011', 'Chlorphenamine', '4 mg',       'TABLET',  FALSE, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- ---------- patients ----------
INSERT INTO patients (id, patient_number, full_name, sex, date_of_birth, date_of_birth_estimated,
                      phone_number, address, known_allergies, created_by, updated_by) VALUES
 ('20000000-0000-4000-8000-000000000001', 'P-0001', 'Saman Kumara',     'MALE',   DATE '1978-04-12', FALSE, '+94771234567', '12 Temple Road, Kandy', 'Penicillin (rash)',
  '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000002', 'P-0002', 'Dilani Wijesekara', 'FEMALE', DATE '1990-11-03', FALSE, '0712345678',   NULL, NULL,
  '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000003', 'P-0003', 'Ishara Gunasekara', 'FEMALE', DATE '2019-06-20', FALSE, '0759876543',   NULL, NULL,
  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003'),
 ('20000000-0000-4000-8000-000000000004', 'P-0004', 'Piyadasa Herath',   'MALE',   (current_date - INTERVAL '70 years')::date, TRUE, NULL, 'Matale', NULL,
  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003'),
 ('20000000-0000-4000-8000-000000000005', 'CARD-77812', 'Fathima Rizvi',  'FEMALE', DATE '1985-02-28', FALSE, NULL, NULL, 'None known',
  '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ---------- queue session for today (OPEN) ----------
INSERT INTO queue_sessions (id, session_date, name, assigned_doctor_id, status,
                            last_issued_number, last_called_number, opened_at, opened_by, created_by)
VALUES ('30000000-0000-4000-8000-000000000001', current_date, 'Morning OPD - Room 1',
        '00000000-0000-4000-8000-000000000002', 'OPEN', 5, 2, now() - INTERVAL '2 hours',
        '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO queue_sessions (id, session_date, name, assigned_doctor_id, status, created_by)
VALUES ('30000000-0000-4000-8000-000000000002', current_date + 1, 'Morning OPD - Room 1',
        '00000000-0000-4000-8000-000000000002', 'SCHEDULED', '00000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO queue_entries (id, queue_session_id, queue_number, status, channel, patient_name, contact_phone,
                           booked_at, booked_by, called_at, called_by, completed_at, completed_by)
VALUES
 ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 'COMPLETED', 'PHONE',
  'Saman Kumara', '+94771234567', now() - INTERVAL '3 hours', '00000000-0000-4000-8000-000000000004',
  now() - INTERVAL '100 minutes', '00000000-0000-4000-8000-000000000002',
  now() - INTERVAL '90 minutes', '00000000-0000-4000-8000-000000000002'),
 ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 2, 'SERVING', 'WALK_IN',
  'Dilani Wijesekara', NULL, now() - INTERVAL '150 minutes', '00000000-0000-4000-8000-000000000004',
  now() - INTERVAL '10 minutes', '00000000-0000-4000-8000-000000000002', NULL, NULL),
 ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 3, 'WAITING', 'PHONE',
  'Ishara Gunasekara (mother calling)', '0759876543', now() - INTERVAL '140 minutes', '00000000-0000-4000-8000-000000000004',
  NULL, NULL, NULL, NULL),
 ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 4, 'WAITING', 'PHONE',
  'Mr. Bandara', '0723456789', now() - INTERVAL '120 minutes', '00000000-0000-4000-8000-000000000004',
  NULL, NULL, NULL, NULL),
 ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 5, 'WAITING', 'WALK_IN',
  'Ms. Rizvi', NULL, now() - INTERVAL '30 minutes', '00000000-0000-4000-8000-000000000004',
  NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------- consultation 1 (yesterday, dispensed, partial) ----------
INSERT INTO consultations (id, patient_id, doctor_id, queue_entry_id, consultation_at, presenting_complaint, clinical_notes)
VALUES ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', NULL, now() - INTERVAL '30 days',
        'Fever and sore throat for 3 days', 'Temp 38.4 C. Tonsils inflamed, no exudate. Advised fluids.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO consultation_diagnoses (id, consultation_id, line_number, condition_text, icd10_code) VALUES
 ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, 'Acute pharyngitis', 'J02.9')
ON CONFLICT (id) DO NOTHING;
INSERT INTO prescriptions (id, prescription_number, consultation_id, patient_id, status, notes, submitted_at, started_at, started_by, updated_at)
VALUES ('50000000-0000-4000-8000-000000000001', 1, '40000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001', 'DISPENSED', NULL, now() - INTERVAL '30 days',
        now() - INTERVAL '30 days' + INTERVAL '5 minutes', '00000000-0000-4000-8000-000000000004', now() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO prescription_items (id, prescription_id, line_number, medicine_id, medicine_name, strength, dosage_form,
                                dose, frequency, duration_days, quantity, quantity_unit, instructions) VALUES
 ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, '10000000-0000-4000-8000-000000000001',
  'Paracetamol', '500 mg', 'TABLET', '2 tablets', '4 times daily (QDS) when needed', 3, 24, 'tablets', 'Maximum 8 tablets in 24 hours'),
 ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, NULL,
  'Chlorhexidine mouthwash', '0.2%', 'SOLUTION', '10 ml', 'Twice daily (BD)', 5, 1, 'bottle', 'Rinse and spit, do not swallow')
ON CONFLICT (id) DO NOTHING;
INSERT INTO dispensings (id, prescription_id, pharmacist_id, dispensed_at, outcome, notes)
VALUES ('52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000004', now() - INTERVAL '30 days' + INTERVAL '12 minutes', 'PARTIAL', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dispensing_items (id, dispensing_id, prescription_id, prescription_item_id, quantity_dispensed, status, note) VALUES
 ('53000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001', 24, 'FULL', NULL),
 ('53000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000002', 0, 'NOT_DISPENSED', 'Out of stock - patient advised to buy outside')
ON CONFLICT (id) DO NOTHING;

-- ---------- consultation 2 (today, pending in pharmacist queue) ----------
INSERT INTO consultations (id, patient_id, doctor_id, queue_entry_id, consultation_at, presenting_complaint, clinical_notes)
VALUES ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', now() - INTERVAL '95 minutes',
        'Review: raised blood sugar on home testing', 'FBS 168 mg/dl (patient report). Lifestyle advice given.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO consultation_diagnoses (id, consultation_id, line_number, condition_text, icd10_code) VALUES
 ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 1, 'Type 2 diabetes mellitus', 'E11.9'),
 ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 2, 'Essential hypertension', 'I10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO prescriptions (id, prescription_number, consultation_id, patient_id, status, notes, submitted_at)
VALUES ('50000000-0000-4000-8000-000000000002', 2, '40000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000001', 'PENDING', 'Patient allergic to penicillin', now() - INTERVAL '94 minutes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO prescription_items (id, prescription_id, line_number, medicine_id, medicine_name, strength, dosage_form,
                                dose, frequency, duration_days, quantity, quantity_unit, instructions) VALUES
 ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 1, '10000000-0000-4000-8000-000000000005',
  'Metformin', '500 mg', 'TABLET', '1 tablet', 'Twice daily (BD)', 30, 60, 'tablets', 'With meals'),
 ('51000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', 2, '10000000-0000-4000-8000-000000000006',
  'Amlodipine', '5 mg', 'TABLET', '1 tablet', 'Once daily (OD) in the morning', 30, 30, 'tablets', NULL)
ON CONFLICT (id) DO NOTHING;

-- Keep the sequence ahead of the fixed seed numbers.
SELECT setval('prescription_number_seq', GREATEST((SELECT max(prescription_number) FROM prescriptions), 1));
```


### 6.3 Entity mapping rules

- One entity class per table, named `<Singular>Entity` (`PatientEntity` -> `patients`), annotated `@Table(name = "...")` with explicit `@Column(name = ...)`.
- Id: `@Id @GeneratedValue(strategy = GenerationType.UUID) UUID id`. `user_roles` is mapped as `@ElementCollection` of `Role` on `UserEntity`
  (`@CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))`, `@Enumerated(EnumType.STRING) @Column(name = "role")`, `FetchType.EAGER`).
- Type mapping: `UUID` -> `UUID`; `VARCHAR/CHAR` -> `String`; enum columns -> Java enums with `@Enumerated(EnumType.STRING)`; `TIMESTAMPTZ` -> `Instant`;
  `DATE` -> `LocalDate`; `NUMERIC(7,2)` -> `BigDecimal` (`@Column(precision = 7, scale = 2)`); `INTEGER` -> `int`/`Integer`; `SMALLINT` -> `short`/`Short`;
  `BIGINT` -> `long`; `BOOLEAN` -> `boolean`; `INET` -> `String` with `@JdbcTypeCode(SqlTypes.INET)`; `JSONB` -> `Map<String, Object>` with `@JdbcTypeCode(SqlTypes.JSON)`.
- `version` columns: `@Version long version` on users, patients, medicines, prescriptions, queue_sessions, queue_entries.
- `prescriptions.prescription_number`: `@Generated(event = EventType.INSERT) @Column(insertable = false, updatable = false)` so the DB sequence default applies and Hibernate reads it back.
- Associations: `@ManyToOne(fetch = FetchType.LAZY)` for every foreign key, or a plain `UUID` field for attribution columns (`*_by`) to avoid loading users.
  Collections only where the aggregate is always written together: `ConsultationEntity.diagnoses`, `PrescriptionEntity.items`, `DispensingEntity.items`
  (`@OneToMany(mappedBy=..., cascade = PERSIST)`, `@OrderBy("lineNumber")`, `List`). No `CascadeType.REMOVE` anywhere; nothing is deleted.
- Immutable tables (`consultations`, `consultation_diagnoses`, `prescription_items`, `dispensings`, `dispensing_items`, `audit_events`) are annotated `@Immutable` (Hibernate) - updates are impossible from Java.
- `created_at` / `updated_at` are set by the service from `BusinessClock` (not by `@CreationTimestamp`) so tests can control time.
- Enums (Java) - exact values as in `openapi.yaml`: `Role`, `Sex`, `DosageForm`, `PrescriptionStatus`, `DispensingOutcome`, `DispensedItemStatus`,
  `QueueSessionStatus`, `QueueEntryStatus`, `BookingChannel`, `AuditOutcome`, `AuditAction`, `ErrorCode`.

### 6.4 Preventing N+1 queries

- `spring.jpa.open-in-view=false`; DTOs are assembled inside the service transaction.
- `hibernate.default_batch_fetch_size=50` as a safety net, plus explicit loading strategies:
  - Medical history: query 1 = page of consultations (`Page<ConsultationEntity>` by patient, sorted by `consultationAt desc, id`); then **one query each** for
    diagnoses, prescriptions, items, dispensings and dispensing items with `WHERE consultation_id IN (:ids)` / `prescription_id IN (:ids)`; then assemble.
    Plus the patient and the conditions summary (example query Q5). Total <= 8 statements per page regardless of page content (asserted in BT-008 with Hibernate `Statistics`).
  - Prescription list: one JPQL projection query with joins to patient, consultation doctor and dispensing plus a `count` subquery for items (example query Q6); count query for the page.
  - Queue session: session row + one grouped count query + one query for SERVING entries.
- Never call a lazy association inside a loop over results.

### 6.5 Repository locking finders

```java
public interface QueueSessionRepository extends JpaRepository<QueueSessionEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from QueueSessionEntity s where s.id = :id")
    Optional<QueueSessionEntity> findByIdForUpdate(@Param("id") UUID id);
}

public interface PrescriptionRepository extends JpaRepository<PrescriptionEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PrescriptionEntity p where p.id = :id")
    Optional<PrescriptionEntity> findByIdForUpdate(@Param("id") UUID id);
}
```

Equivalent `findByIdForUpdate` finders exist for `RefreshTokenEntity` (by `tokenHash`) and for enabled admins (`findEnabledAdminsForUpdate`, ordered by id).
Queue entries are not locked separately: every queue mutation first locks the session row (fixed lock order: session, then entries).

## 7. Transactions, locking and idempotency

### 7.1 Transaction boundaries

Each public service method that serves one API operation is `@Transactional` (read endpoints `@Transactional(readOnly = true)`, except audited
reads which write the audit row - use `@Transactional` without readOnly for those). One operation = one transaction; no nested
`REQUIRES_NEW` except for the failed-login counter update (so it survives the 401). Concrete locking per operation:

| Operation | Lock / guard | On conflict |
|---|---|---|
| createPatient | `uq_patients_patient_number` (+ pre-check `existsByPatientNumber`) | 409 DUPLICATE_PATIENT_NUMBER with existingPatientId |
| updatePatient / updateUser / updateMedicine | `@Version` compared with `version` from the body (`if (entity.getVersion() != req.version()) throw CONCURRENT_MODIFICATION`) + JPA optimistic check at flush | 409 CONCURRENT_MODIFICATION |
| createConsultation / addPrescriptionToConsultation | idempotency row; `uq_consultations_queue_entry`; `uq_prescriptions_active_per_consultation` | 409 as catalogued |
| startPrescription / dispensePrescription / cancelPrescription | `prescriptionRepository.findByIdForUpdate` then state machine; `uq_dispensings_prescription` backstop | 409 INVALID_STATUS_TRANSITION |
| createBooking, callNextPatient, queue-entry transitions, open/close session | `queueSessionRepository.findByIdForUpdate` first; then entries | 409 per catalogue |
| refreshToken | `refreshTokenRepository.findByTokenHashForUpdate` | 401 REFRESH_TOKEN_ROTATED / SESSION_REVOKED |

Lock timeouts (`PessimisticLockException`, `LockTimeoutException`, `CannotAcquireLockException`, SQLSTATE `55P03`) map to `503 SERVICE_UNAVAILABLE`.

### 7.2 Constraint name -> error code mapping

`ConstraintErrorMapper` inspects `DataIntegrityViolationException` -> `ConstraintViolationException.getConstraintName()`:

| Constraint | ErrorCode |
|---|---|
| `uq_patients_patient_number` | DUPLICATE_PATIENT_NUMBER |
| `uq_users_username` | DUPLICATE_USERNAME |
| `uq_medicines_name_strength_form` | DUPLICATE_MEDICINE |
| `uq_queue_sessions_date_name` | DUPLICATE_QUEUE_SESSION |
| `uq_queue_entries_session_number` | 503 SERVICE_UNAVAILABLE (must never happen; log ERROR - indicates a locking bug) |
| `uq_consultations_queue_entry` | QUEUE_ENTRY_ALREADY_LINKED |
| `uq_prescriptions_active_per_consultation` | ACTIVE_PRESCRIPTION_EXISTS |
| `uq_prescriptions_supersedes` | INVALID_SUPERSEDED_PRESCRIPTION |
| `uq_dispensings_prescription`, `uq_dispensing_items_item` | INVALID_STATUS_TRANSITION (currentStatus DISPENSED) |
| any other | 500 INTERNAL_ERROR (logged with constraint name) |

Because a constraint violation aborts the PostgreSQL transaction, call `repository.saveAndFlush(...)` at the point where a unique violation is
expected and let the exception propagate out of the `@Transactional` method; map it in `GlobalExceptionHandler`. Do not catch and continue inside the transaction.

### 7.3 Idempotency (`common.idempotency`)

Required on `createPatient`, `createConsultation`, `addPrescriptionToConsultation`, `createBooking`, `dispensePrescription`.

```java
// inside the operation's @Transactional service method, as the FIRST statement
IdempotencyResult r = idempotencyService.begin(currentUserId, idempotencyKey, "createConsultation", requestHash);
if (r.isReplay()) {
    return Replay.of(r.responseStatus(), consultationQueryService.get(r.resourceId()));   // current state, original status
}
// ... perform the operation ...
idempotencyService.complete(r.rowId(), consultation.getId(), 201);
```

- `begin` executes a native `INSERT INTO idempotency_keys (id, user_id, idempotency_key, operation, request_hash, created_at, expires_at)
  VALUES (...) ON CONFLICT (user_id, idempotency_key) DO NOTHING RETURNING id`. If no id is returned it selects the existing row:
  different `operation` or `request_hash` -> throw `IDEMPOTENCY_KEY_REUSED`; otherwise return a replay result. A concurrent duplicate blocks on the
  unique index until the first transaction commits (then replays) or rolls back (then proceeds) - no in-progress state is needed.
- `requestHash` = SHA-256 hex of `operationId + "\n" + request path + "\n" + canonical JSON of the validated request DTO` (Jackson with `ORDER_MAP_ENTRIES_BY_KEYS` and sorted properties).
- The controller validates the header: missing or not matching `^[A-Za-z0-9_-]{8,100}$` -> `400 IDEMPOTENCY_KEY_REQUIRED` before calling the service.
- Replays return the same status code (201 for creates, 200 for dispense) and the same `Location` header.
- Expiry 24 h (`expires_at`); purged by the retention job.

## 8. API implementation

### 8.1 Operations, controllers and authorisation

Every operation of `openapi.yaml`, its controller, method security expression, DTOs, success status and audit actions. Controller method names equal the operationId.


| operationId | Endpoint | Authorization | Controller | Request DTO | Success | Idem. | Audit |
|---|---|---|---|---|---|---|---|
| `login` | POST `/api/v1/auth/login` | `permitAll (security chain)` | auth.AuthController | LoginRequest | 200 TokenResponse | - | AUTH_LOGIN_SUCCEEDED, AUTH_LOGIN_FAILED, AUTH_ACCOUNT_LOCKED |
| `refreshToken` | POST `/api/v1/auth/refresh` | `permitAll (security chain)` | auth.AuthController | - | 200 TokenResponse | - | AUTH_REFRESH_REUSE_DETECTED |
| `logout` | POST `/api/v1/auth/logout` | `permitAll (security chain)` | auth.AuthController | - | 204 (empty) | - | AUTH_LOGOUT |
| `getCurrentUser` | GET `/api/v1/auth/me` | `isAuthenticated()` | auth.AuthController | - | 200 CurrentUser | - | - |
| `changePassword` | POST `/api/v1/auth/change-password` | `isAuthenticated()` | auth.AuthController | ChangePasswordRequest | 204 (empty) | - | AUTH_PASSWORD_CHANGED |
| `listUsers` | GET `/api/v1/users` | `hasAnyRole('ADMIN')` | user.UserController | - | 200 UserPage | - | - |
| `createUser` | POST `/api/v1/users` | `hasAnyRole('ADMIN')` | user.UserController | CreateUserRequest | 201 UserResponse | - | USER_CREATED |
| `getUser` | GET `/api/v1/users/{userId}` | `hasAnyRole('ADMIN')` | user.UserController | - | 200 UserResponse | - | - |
| `updateUser` | PUT `/api/v1/users/{userId}` | `hasAnyRole('ADMIN')` | user.UserController | UpdateUserRequest | 200 UserResponse | - | USER_UPDATED |
| `resetUserPassword` | POST `/api/v1/users/{userId}/reset-password` | `hasAnyRole('ADMIN')` | user.UserController | ResetPasswordRequest | 204 (empty) | - | USER_PASSWORD_RESET |
| `listStaff` | GET `/api/v1/staff` | `hasAnyRole('ADMIN', 'DOCTOR', 'PHARMACIST')` | user.StaffController | - | 200 StaffList | - | - |
| `searchPatients` | GET `/api/v1/patients` | `hasAnyRole('DOCTOR')` | patient.PatientController | - | 200 PatientSummaryPage | - | PATIENT_SEARCHED |
| `createPatient` | POST `/api/v1/patients` | `hasAnyRole('DOCTOR')` | patient.PatientController | CreatePatientRequest | 201 PatientResponse | yes | PATIENT_CREATED |
| `getPatientByNumber` | GET `/api/v1/patients/by-number/{patientNumber}` | `hasAnyRole('DOCTOR')` | patient.PatientController | - | 200 PatientResponse | - | PATIENT_VIEWED |
| `getPatient` | GET `/api/v1/patients/{patientId}` | `hasAnyRole('DOCTOR')` | patient.PatientController | - | 200 PatientResponse | - | PATIENT_VIEWED |
| `updatePatient` | PUT `/api/v1/patients/{patientId}` | `hasAnyRole('DOCTOR')` | patient.PatientController | UpdatePatientRequest | 200 PatientResponse | - | PATIENT_UPDATED |
| `getMedicalHistory` | GET `/api/v1/patients/{patientId}/medical-history` | `hasAnyRole('DOCTOR')` | patient.PatientController | - | 200 MedicalHistoryResponse | - | PATIENT_HISTORY_VIEWED |
| `createConsultation` | POST `/api/v1/consultations` | `hasAnyRole('DOCTOR')` | consultation.ConsultationController | CreateConsultationRequest | 201 ConsultationResponse | yes | CONSULTATION_CREATED, PRESCRIPTION_CREATED |
| `getConsultation` | GET `/api/v1/consultations/{consultationId}` | `hasAnyRole('DOCTOR')` | consultation.ConsultationController | - | 200 ConsultationResponse | - | CONSULTATION_VIEWED |
| `addPrescriptionToConsultation` | POST `/api/v1/consultations/{consultationId}/prescriptions` | `hasAnyRole('DOCTOR')` | prescription.PrescriptionController | AddPrescriptionRequest | 201 PrescriptionResponse | yes | PRESCRIPTION_CREATED |
| `listPrescriptions` | GET `/api/v1/prescriptions` | `hasAnyRole('PHARMACIST', 'DOCTOR')` | prescription.PrescriptionController | - | 200 PrescriptionSummaryPage | - | - |
| `getPrescription` | GET `/api/v1/prescriptions/{prescriptionId}` | `hasAnyRole('PHARMACIST', 'DOCTOR')` | prescription.PrescriptionController | - | 200 PrescriptionResponse | - | PRESCRIPTION_VIEWED |
| `startPrescription` | POST `/api/v1/prescriptions/{prescriptionId}/start` | `hasAnyRole('PHARMACIST')` | pharmacy.DispensingController | - | 200 PrescriptionResponse | - | PRESCRIPTION_STARTED |
| `dispensePrescription` | POST `/api/v1/prescriptions/{prescriptionId}/dispense` | `hasAnyRole('PHARMACIST')` | pharmacy.DispensingController | DispenseRequest | 200 PrescriptionResponse | yes | PRESCRIPTION_DISPENSED |
| `cancelPrescription` | POST `/api/v1/prescriptions/{prescriptionId}/cancel` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | prescription.PrescriptionController | CancelPrescriptionRequest | 200 PrescriptionResponse | - | PRESCRIPTION_CANCELLED |
| `listMedicines` | GET `/api/v1/medicines` | `hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN')` | medicine.MedicineController | - | 200 MedicinePage | - | - |
| `createMedicine` | POST `/api/v1/medicines` | `hasAnyRole('PHARMACIST', 'ADMIN')` | medicine.MedicineController | CreateMedicineRequest | 201 MedicineResponse | - | MEDICINE_CREATED |
| `getMedicine` | GET `/api/v1/medicines/{medicineId}` | `hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN')` | medicine.MedicineController | - | 200 MedicineResponse | - | - |
| `updateMedicine` | PUT `/api/v1/medicines/{medicineId}` | `hasAnyRole('PHARMACIST', 'ADMIN')` | medicine.MedicineController | UpdateMedicineRequest | 200 MedicineResponse | - | MEDICINE_UPDATED |
| `listQueueSessions` | GET `/api/v1/queue-sessions` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueSessionController | - | 200 QueueSessionPage | - | - |
| `createQueueSession` | POST `/api/v1/queue-sessions` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueSessionController | CreateQueueSessionRequest | 201 QueueSessionResponse | - | QUEUE_SESSION_CREATED |
| `getQueueSession` | GET `/api/v1/queue-sessions/{queueSessionId}` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueSessionController | - | 200 QueueSessionResponse | - | - |
| `openQueueSession` | POST `/api/v1/queue-sessions/{queueSessionId}/open` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueSessionController | - | 200 QueueSessionResponse | - | QUEUE_SESSION_OPENED |
| `closeQueueSession` | POST `/api/v1/queue-sessions/{queueSessionId}/close` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueSessionController | CloseQueueSessionRequest | 200 QueueSessionResponse | - | QUEUE_SESSION_CLOSED |
| `listQueueEntries` | GET `/api/v1/queue-sessions/{queueSessionId}/entries` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.BookingController | - | 200 QueueEntryPage | - | - |
| `createBooking` | POST `/api/v1/queue-sessions/{queueSessionId}/entries` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.BookingController | CreateBookingRequest | 201 QueueEntryResponse | yes | BOOKING_CREATED |
| `callNextPatient` | POST `/api/v1/queue-sessions/{queueSessionId}/call-next` | `hasAnyRole('DOCTOR')` | queue.QueueSessionController | CallNextRequest | 200 CallNextResponse | - | QUEUE_ENTRY_COMPLETED, QUEUE_ENTRY_CALLED |
| `getQueueEntry` | GET `/api/v1/queue-entries/{queueEntryId}` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueEntryController | - | 200 QueueEntryResponse | - | - |
| `callQueueEntry` | POST `/api/v1/queue-entries/{queueEntryId}/call` | `hasAnyRole('DOCTOR')` | queue.QueueEntryController | - | 200 QueueEntryResponse | - | QUEUE_ENTRY_CALLED |
| `completeQueueEntry` | POST `/api/v1/queue-entries/{queueEntryId}/complete` | `hasAnyRole('DOCTOR')` | queue.QueueEntryController | - | 200 QueueEntryResponse | - | QUEUE_ENTRY_COMPLETED |
| `skipQueueEntry` | POST `/api/v1/queue-entries/{queueEntryId}/skip` | `hasAnyRole('DOCTOR')` | queue.QueueEntryController | SkipQueueEntryRequest | 200 QueueEntryResponse | - | QUEUE_ENTRY_SKIPPED |
| `requeueQueueEntry` | POST `/api/v1/queue-entries/{queueEntryId}/requeue` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.QueueEntryController | - | 200 QueueEntryResponse | - | QUEUE_ENTRY_REQUEUED |
| `cancelBooking` | POST `/api/v1/queue-entries/{queueEntryId}/cancel` | `hasAnyRole('DOCTOR', 'PHARMACIST')` | queue.BookingController | CancelBookingRequest | 200 QueueEntryResponse | - | BOOKING_CANCELLED |
| `listPublicQueueSessions` | GET `/api/v1/public/queue-sessions` | `permitAll (security chain)` | queue.PublicQueueController | - | 200 PublicQueueSessionList | - | - |
| `getPublicQueueStatus` | GET `/api/v1/public/queue-sessions/{queueSessionId}` | `permitAll (security chain)` | queue.PublicQueueController | - | 200 PublicQueueStatus | - | - |
| `listAuditEvents` | GET `/api/v1/audit-events` | `hasAnyRole('ADMIN')` | audit.AuditController | - | 200 AuditEventPage | - | AUDIT_LOG_VIEWED |
| `health` | GET `/actuator/health` | `permitAll (security chain)` | Spring Boot Actuator (no controller) | - | 200 HealthStatus | - | - |
| `healthLiveness` | GET `/actuator/health/liveness` | `permitAll (security chain)` | Spring Boot Actuator (no controller) | - | 200 HealthStatus | - | - |
| `healthReadiness` | GET `/actuator/health/readiness` | `permitAll (security chain)` | Spring Boot Actuator (no controller) | - | 200 HealthStatus | - | - |



### 8.2 DTOs

- Java `record` per schema of `openapi.yaml` with the **same name** (`CreateConsultationRequest`, `PrescriptionResponse`, `PatientSummaryPage` ...),
  in the owning module's `dto` package; shared ones (`Problem`, `FieldError`, `StaffRef`, `PageResponse<T>`) in `common`.
- Page schemas (`XxxPage`) are produced by a generic `record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages)`; springdoc
  must still publish them under the contract names - annotate controller return types with `@Schema(implementation = PatientSummaryPage.class)` using small
  marker records, or customise with an `OpenApiCustomizer` so that the generated document matches `openapi.yaml` (verified by BT-029).
- Every response field listed in the schema is always serialised (nulls included). Request fields marked nullable accept `null` or absence.
- Decimal fields (`quantity`, `quantityDispensed`) are `BigDecimal`, serialised as JSON numbers (`JsonFormat.Shape.NUMBER`), never strings.
- `prescriptionNumber` is formatted `String.format("RX-%06d", number)`; the list filter accepts `RX-000123` or `123`.
- `ageYears` = `Period.between(dateOfBirth, businessClock.today()).getYears()`.

### 8.3 Validation annotations (schema keyword -> annotation)

| openapi.yaml | Bean Validation |
|---|---|
| `required` (non-null) | `@NotNull`; strings additionally `@NotBlank` |
| `minLength` / `maxLength` | `@Size(min, max)` (after trimming - see below) |
| `pattern` | `@Pattern(regexp)` |
| `minimum` / `maximum` (integers) | `@Min` / `@Max` |
| `exclusiveMinimum: 0` (decimal) / `maximum: 99999.99` | `@DecimalMin(value = "0", inclusive = false)`, `@DecimalMax("99999.99")`, `@Digits(integer = 5, fraction = 2)` |
| `minItems` / `maxItems` | `@Size` on the list; elements `@Valid` |
| `format: uuid` / `date` / `date-time` | `UUID`, `LocalDate`, `Instant` types (parse failure -> 400 MALFORMED_REQUEST) |
| enums | Java enum type |
| `oneOf` dateOfBirth / estimatedAgeYears | class-level `@ExactlyOneOf({"dateOfBirth", "estimatedAgeYears"})` (UpdatePatientRequest: `dateOfBirth` requires `dateOfBirthEstimated`) |
| `if/then` medicineId vs medicineName | class-level `@MedicineReference` on `PrescriptionItemInput` |

Additional rules: a Jackson `StringDeserializer` customisation trims all strings and turns blank optional strings into `null`; `@PastOrPresent`
(with `BusinessClock`) and `@AfterOrEqual("1900-01-01")` on `dateOfBirth`; phone numbers are normalised (remove spaces, `-`, `(`, `)`) **before**
validation by a `@JsonDeserialize(using = PhoneNumberDeserializer.class)`, then `@Pattern("^\\+?[0-9]{7,15}$")`; `patientNumber` is trimmed and
upper-cased by its deserializer before `@Pattern("^[A-Z0-9][A-Z0-9-]{2,19}$")`; `username` is lower-cased. Query parameters are validated with
`@Validated` on the controller (`@Min(0) int page`, `@Min(1) @Max(100) int size`, sort whitelist). All violations are reported together (EH-03).

### 8.4 Pagination and sorting

`page`/`size` are bound to `int` parameters (not raw `Pageable`, to keep validation explicit) and converted with a per-endpoint `SortWhitelist`
(e.g. `listPrescriptions`: `submittedAt,asc` -> `Sort.by("submittedAt").ascending().and(Sort.by("id"))`). Any other `sort` value -> 400. Always add `id`
as tie-breaker for stable paging.

### 8.5 Response headers

- `Location` on every 201 (`/api/v1/<resource>/{id}`).
- `X-Request-Id` on every response (from `RequestIdFilter`).
- `Cache-Control: no-store` on every `/api/v1/**` response except public queue endpoints, which send `Cache-Control: no-cache` and `ETag`.
- ETag for `getPublicQueueStatus` and `getQueueSession`: `W/"<sessionId>-<version>"`. Compare `If-None-Match` before building the body
  (`select version from queue_sessions where id = ?`); match -> `304` with no body.

### 8.6 OpenAPI / Swagger

- springdoc publishes `/v3/api-docs` and Swagger UI at `/swagger-ui.html` when `APP_SWAGGER_ENABLED=true` (dev). Both are permitted anonymously by the security chain only when enabled.
- `OpenApiConfig` defines the `bearerAuth` (HTTP bearer JWT) and `refreshCookie` (cookie `dms_refresh`) security schemes, the server URL and the info block of `openapi.yaml`.
- Copy `docs/openapi.yaml` to `src/main/resources/static/openapi.yaml`? **No** - the contract test (BT-029) reads it from `../docs/openapi.yaml` and compares paths, methods, status codes and schema names with `/v3/api-docs`.

### 8.7 CORS

Same-origin is the default deployment (the browser talks to the Next.js origin, which proxies `/api`). CORS is configured only if
`APP_CORS_ALLOWED_ORIGINS` is non-empty: allowed origins exactly as listed (no wildcards), methods `GET, POST, PUT, OPTIONS`, headers
`Authorization, Content-Type, Idempotency-Key, X-Request-Id, X-Requested-With, If-None-Match`, exposed headers `Location, ETag, X-Request-Id, Retry-After`,
`allowCredentials=true`, `maxAge=3600`.

## 9. Authentication and authorisation

### 9.1 Security filter chain

```java
@Bean
SecurityFilterChain api(HttpSecurity http, ...) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())                       // bearer tokens; cookie endpoints protected by SameSite=Strict + X-Requested-With check
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(a -> a
            .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
            .requestMatchers("/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness").permitAll()
            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").access(swaggerEnabled())
            .requestMatchers("/actuator/prometheus").access(privateNetworkOnly())
            .requestMatchers("/api/v1/**").authenticated()
            .anyRequest().denyAll())
        .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(rolesConverter()))
                                    .authenticationEntryPoint(restAuthenticationEntryPoint))
        .exceptionHandling(e -> e.authenticationEntryPoint(restAuthenticationEntryPoint).accessDeniedHandler(restAccessDeniedHandler))
        .addFilterBefore(requestIdFilter, SecurityContextHolderFilter.class)
        .addFilterBefore(rateLimitFilter, BearerTokenAuthenticationFilter.class)
        .addFilterAfter(passwordChangeRequiredFilter, BearerTokenAuthenticationFilter.class)
        .headers(h -> h.contentTypeOptions(Customizer.withDefaults()).frameOptions(f -> f.deny())
                       .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
        .build();
}
```

- `@EnableMethodSecurity`; every controller method carries the `@PreAuthorize` expression from section 8.1. A unit test fails if any `@RequestMapping` method lacks it (except public auth endpoints and public queue endpoints).
- `rolesConverter()` maps claim `roles` (array) to `ROLE_<value>` authorities.
- `RestAuthenticationEntryPoint` writes Problem Details: `TOKEN_EXPIRED` when the JWT is expired (`JwtValidationException` with expired-token error), otherwise `UNAUTHENTICATED`.
- `RestAccessDeniedHandler` writes `403 FORBIDDEN` and, for paths under `/patients`, `/consultations`, `/prescriptions`, writes an `ACCESS_DENIED` audit event (outcome DENIED).
- `PasswordChangeRequiredFilter`: if the token has `pwd_change=true` and the request is not `GET /api/v1/auth/me`, `POST /api/v1/auth/change-password` or `POST /api/v1/auth/logout` -> `403 PASSWORD_CHANGE_REQUIRED`.

### 9.2 Tokens

- **Access token:** `NimbusJwtEncoder` with an `ImmutableSecret` HMAC-SHA256 key from `APP_JWT_SECRET` (Base64-decoded); `NimbusJwtDecoder.withSecretKey(...)`
  with issuer validator. Claims: `sub` = user id, `roles` = role names, `pwd_change` = boolean, `iss`, `iat`, `exp` = iat + `APP_JWT_ACCESS_TOKEN_TTL`, `jti` = random UUID. Clock skew 30 s.
- **Refresh token:** 32 random bytes from `SecureRandom`, Base64url (no padding) in the cookie; DB stores lower-case hex SHA-256 in `token_hash`.
  Login creates a new `family_id` with `expires_at = now + APP_JWT_REFRESH_TOKEN_TTL`; rotation copies the family expiry.
- **Cookie:** `ResponseCookie.from("dms_refresh", raw).httpOnly(true).secure(appProps.refreshCookieSecure()).sameSite("Strict").path("/api/v1/auth").maxAge(remaining)`; logout sets `maxAge(0)`.
- **Refresh algorithm** (`RefreshTokenService.rotate`, one transaction):
  1. Require header `X-Requested-With: XMLHttpRequest`, else `401 REFRESH_TOKEN_INVALID`.
  2. Hash the cookie value; `findByTokenHashForUpdate`. Not found, revoked or expired -> `401 REFRESH_TOKEN_INVALID` + clear cookie.
  3. If `rotated_at` is set: rotated < 30 s ago -> `401 REFRESH_TOKEN_ROTATED` (do not clear the cookie, do not revoke); else revoke all tokens of the family (`REUSE_DETECTED`), audit `AUTH_REFRESH_REUSE_DETECTED`, `401 SESSION_REVOKED`, clear cookie.
  4. Load the user; disabled -> revoke family (`USER_DISABLED`), `401 ACCOUNT_DISABLED`.
  5. Mark the token rotated, insert the successor (same family and expiry), set `replaced_by_id`, issue a new access token (roles re-read from the DB).
- **Revocation events:** logout (family, `LOGOUT`), change password (all other families, `PASSWORD_CHANGED`), admin reset (all, `PASSWORD_RESET`), disable (all, `USER_DISABLED`).

### 9.3 Login and passwords

- `DelegatingPasswordEncoder` with BCrypt strength 12 as default (`{bcrypt}` prefix).
- Unknown username: run `passwordEncoder.matches(raw, DUMMY_HASH)` (a precomputed BCrypt-12 hash) to equalise timing, then `401 INVALID_CREDENTIALS`.
- Wrong password: `UPDATE users SET failed_login_count = failed_login_count + 1 ...` in a `REQUIRES_NEW` transaction; on the 5th failure set
  `locked_until = now + 15 min`, `failed_login_count = 0` and audit `AUTH_ACCOUNT_LOCKED`. Response `401 INVALID_CREDENTIALS`.
- Correct password: locked -> `401 ACCOUNT_LOCKED` (with `lockedUntil`); disabled -> `401 ACCOUNT_DISABLED`; else reset the counter, set `last_login_at`, issue tokens, audit `AUTH_LOGIN_SUCCEEDED`.
- Password policy (`PasswordPolicy`): length 12-128; not equal to the current password; does not contain the username (case-insensitive); not in `security/common-passwords.txt`
  (load the file once into a `HashSet`; compare lower-case). Violations -> `422 PASSWORD_POLICY_VIOLATION` with `errors[0].field`.
- **Bootstrap admin** (`BootstrapAdminRunner`, `ApplicationRunner`): if `users` is empty and both bootstrap variables are set, create the ADMIN with `must_change_password = true`
  and log `INFO "Bootstrap administrator <username> created"` (never the password). If the table is empty and the variables are missing, log a WARN.

### 9.4 Authorisation details and medical-record protection

- Role expressions per operation: section 8.1 (generated from `openapi.yaml`). `ANY_STAFF` = `isAuthenticated()`.
- Ownership: `cancelPrescription` by a DOCTOR (who is not also PHARMACIST) requires `consultation.doctorId == currentUser.id` -> otherwise `403 NOT_RESOURCE_OWNER`;
  `addPrescriptionToConsultation` requires the consultation's doctor. `listPrescriptions` for a user without PHARMACIST forces `doctorId = currentUser.id`.
- DTO separation: `PrescriptionResponse` (pharmacist view) contains no diagnoses or notes by construction; public DTOs contain no personal data by construction.
  Never reuse a richer DTO and "null out" fields.
- `CurrentUser` (resolved from the JWT: id, username, roles) is passed explicitly from controllers to services as a parameter; services never read the security context directly (easier to test).

### 9.5 Rate limiting

`RateLimitFilter` keeps a `ConcurrentHashMap<String, Bucket>` keyed by `clientIp + bucketName` (Caffeine-style expiry not needed; evict buckets idle for 10 minutes with a scheduled cleanup).
Buckets: `login` (`APP_RATE_LIMIT_LOGIN_PER_MINUTE` per minute, greedy refill) for `POST /api/v1/auth/login`; `public` (`APP_RATE_LIMIT_PUBLIC_PER_MINUTE`) for `/api/v1/public/**`.
Exceeded -> `429 RATE_LIMITED` with `Retry-After` and `retryAfterSeconds`. Client IP = `request.getRemoteAddr()` (correct behind the proxy when `SERVER_FORWARD_HEADERS_STRATEGY=native`).

## 10. Business logic by module

All rules below are binding; BR identifiers refer to SRS section 7.

### 10.1 BusinessClock

`BusinessClock` wraps an injectable `java.time.Clock` (UTC) and `APP_TIMEZONE`: `Instant now()`, `LocalDate today()` (in the dispensary zone),
`Instant startOfToday()`. All services use it; never call `Instant.now()` / `LocalDate.now()` directly (ArchUnit rule).

### 10.2 Patients (`patient`)

- `createPatient`: idempotency begin -> normalise -> `existsByPatientNumber` -> if exists throw `DUPLICATE_PATIENT_NUMBER` with `existingPatientId` ->
  DOB: if `estimatedAgeYears` present `dob = today.minusYears(n)`, `estimated = true`; else `dob = dateOfBirth`, `estimated = false` -> validate DOB in [1900-01-01, today] ->
  `saveAndFlush` -> audit `PATIENT_CREATED` (`details = {patientNumber}`) -> 201.
- `getPatientByNumber`: normalise (trim + upper) -> 404 `PATIENT_NOT_FOUND` with detail "No patient with patient number X" -> audit `PATIENT_VIEWED` (`via=NUMBER`).
- `searchPatients`: trimmed term 2-100; query `full_name ILIKE %term%` (escape `%` and `_` in the term), `OR patient_number LIKE upper(term)%`, `OR phone_number = normalised(term)`; sort by full name, patient number; audit `PATIENT_SEARCHED` (`search`, `resultCount`).
- `updatePatient`: version check; DOB rule (`dateOfBirth` + `dateOfBirthEstimated`, or `estimatedAgeYears`); compute changed field names; audit `PATIENT_UPDATED` (`changedFields`).
- `getMedicalHistory`: see 6.4; conditions summary = example query Q5; audit `PATIENT_HISTORY_VIEWED` (`page`, `size`).

### 10.3 Consultations (`consultation`)

`createConsultation` (one transaction):
1. Idempotency begin (`createConsultation`).
2. Load patient (`REFERENCED_RESOURCE_NOT_FOUND`, field `patientId`).
3. If `queueEntryId`: load entry (`REFERENCED_RESOURCE_NOT_FOUND`), require status SERVING or COMPLETED (`QUEUE_ENTRY_NOT_IN_SESSION` otherwise), and not linked (`QUEUE_ENTRY_ALREADY_LINKED`).
4. Build `ConsultationEntity` (doctor = current user, `consultationAt` = now) with diagnoses (line numbers 1..n in input order).
5. If `prescription` present: `prescriptionService.createForConsultation(consultation, input)`:
   resolve each item - with `medicineId`: load medicine (`REFERENCED_RESOURCE_NOT_FOUND` with field `prescription.items[i].medicineId`), require `active` (`MEDICINE_INACTIVE`), copy name/strength/form;
   without: use the supplied `medicineName`, `strength`, `dosageForm` - then create `PrescriptionEntity` (status PENDING, `submittedAt` = now) with items (line numbers 1..n).
   Collect **all** item errors before throwing (one 422 with several `errors[]`).
6. `saveAndFlush`; audit `CONSULTATION_CREATED` (+ `PRESCRIPTION_CREATED` when applicable); idempotency complete (201).
7. Return `ConsultationResponse` built by the same query service used by `getConsultation`.

### 10.4 Prescriptions (`prescription`)

`PrescriptionStateMachine` (pure Java):

**Prescription status** (`prescriptions.status`, enum `PrescriptionStatus`)

| From | Action | To / result | Who |
|---|---|---|---|
| (new) | create consultation / add prescription | PENDING | DOCTOR |
| PENDING | start | IN_PROGRESS | PHARMACIST |
| PENDING | dispense | DISPENSED | PHARMACIST |
| IN_PROGRESS | dispense | DISPENSED | PHARMACIST |
| PENDING, IN_PROGRESS | cancel (reason) | CANCELLED | prescribing DOCTOR, any PHARMACIST |
| IN_PROGRESS | start (repeat) | IN_PROGRESS (no-op, 200) | PHARMACIST |
| CANCELLED | cancel (repeat) | CANCELLED (no-op, 200) | as cancel |
| DISPENSED | start / cancel / dispense | 409 INVALID_STATUS_TRANSITION | - |
| CANCELLED | start / dispense | 409 INVALID_STATUS_TRANSITION | - |

**Dispensing outcome** (`dispensings.outcome`, enum `DispensingOutcome`): `FULL` when every item is fully dispensed, otherwise `PARTIAL`. **Dispensed item status** (`dispensing_items.status`, enum `DispensedItemStatus`): `FULL` (= prescribed), `PARTIAL` (0 < qty < prescribed), `NOT_DISPENSED` (0). Both are derived by the server, never sent by the client.

**Queue entry status** (`queue_entries.status`, enum `QueueEntryStatus` - a separate lifecycle from prescriptions)

| From | Action | To / result | Who |
|---|---|---|---|
| (new) | create booking | WAITING | DOCTOR, PHARMACIST |
| WAITING | call-next / call | SERVING | DOCTOR (session OPEN) |
| WAITING | cancel (reason) | CANCELLED | DOCTOR, PHARMACIST |
| SERVING | complete / call-next completeCurrentEntryId | COMPLETED | DOCTOR |
| SERVING | skip | SKIPPED | DOCTOR |
| SKIPPED | requeue | WAITING (same number) | DOCTOR, PHARMACIST |
| WAITING | session close force=true | CANCELLED ("Session closed") | system |
| SERVING | session close force=true | COMPLETED | system |
| same as target | repeat call / complete / skip / cancel / requeue | unchanged (no-op, 200) | - |
| any other | any | 409 INVALID_STATUS_TRANSITION | - |

**Queue session status** (`queue_sessions.status`, enum `QueueSessionStatus`)

| From | Action | To / result | Who |
|---|---|---|---|
| (new) | create | SCHEDULED | DOCTOR, PHARMACIST |
| SCHEDULED | open (only on sessionDate) | OPEN | DOCTOR, PHARMACIST |
| SCHEDULED, OPEN | close (force if active entries) | CLOSED | DOCTOR, PHARMACIST, nightly job |
| OPEN | open (repeat) | OPEN (no-op) | - |
| CLOSED | any mutation or booking | 409 QUEUE_SESSION_CLOSED | - |


- `cancelPrescription`: lock -> ownership (9.4) -> state machine (`CANCELLED` again -> no-op 200) -> set `cancelledAt/By`, `cancelReason` -> audit `PRESCRIPTION_CANCELLED` (`fromStatus`, `toStatus`).
- `addPrescriptionToConsultation`: idempotency -> load consultation (404) -> doctor check (403 NOT_RESOURCE_OWNER) -> `now - consultationAt <= 24h` else `CONSULTATION_LOCKED` ->
  if `supersedesPrescriptionId`: must belong to the consultation, be CANCELLED and not already superseded (`INVALID_SUPERSEDED_PRESCRIPTION`) -> create prescription (same item rules) -> `saveAndFlush` (partial unique index guards concurrency) -> audit -> 201.
- `supersededByPrescriptionId` in responses = id of the prescription whose `supersedes_prescription_id` equals this id (batch-loaded).
- `listPrescriptions`: default statuses PENDING + IN_PROGRESS; filters as in the contract; doctor scoping (9.4); projection query (6.4).
- `getPrescription`: audit `PRESCRIPTION_VIEWED`; ETag `W/"<id>-<version>"` header.

### 10.5 Pharmacy (`pharmacy`)

- `startPrescription`: lock; PENDING -> IN_PROGRESS (set `startedAt/By`); IN_PROGRESS -> no-op 200; else 409 with `currentStatus`; audit `PRESCRIPTION_STARTED`.
- `dispensePrescription` (one transaction):
  1. Idempotency begin (`dispensePrescription`, path includes the prescription id).
  2. `findByIdForUpdate` (404 `PRESCRIPTION_NOT_FOUND`); status must be PENDING or IN_PROGRESS, else 409 `INVALID_STATUS_TRANSITION` with `currentStatus`.
  3. The set of `prescriptionItemId`s must equal the prescription's item ids, no duplicates -> else `DISPENSE_ITEMS_MISMATCH`.
  4. Per item: `quantityDispensed` scale <= 2, `0 <= q <= prescribed` (`DISPENSE_QUANTITY_EXCEEDS_PRESCRIBED`, field `items[i].quantityDispensed`);
     status = `q.compareTo(prescribed) == 0 ? FULL : q.signum() == 0 ? NOT_DISPENSED : PARTIAL` (use `compareTo`, never `equals`, for BigDecimal);
     non-FULL without a non-blank note -> `DISPENSE_NOTE_REQUIRED`. All items zero -> `NOTHING_DISPENSED`. Report all item errors together.
  5. Insert `DispensingEntity` (pharmacist = current user, `dispensedAt` = now, outcome = all FULL ? FULL : PARTIAL) with items; set prescription status DISPENSED (if PENDING, also set `startedAt/By` = now/current user for consistency).
  6. `saveAndFlush`; audit `PRESCRIPTION_DISPENSED` (`fromStatus`, `toStatus`, `outcome`, `dispensingId`); idempotency complete (200).
- No stock is changed (no inventory). There is no un-dispense operation.

### 10.6 Medicines (`medicine`)

CRUD per contract; uniqueness pre-check + constraint; search `name ILIKE %term%` ordered by name, strength; `active` filter (true/false/omitted = both). Audit `MEDICINE_CREATED/UPDATED`.

### 10.7 Queue (`queue`)

- **createQueueSession:** `sessionDate` in [today, today+30] (`INVALID_SESSION_DATE`); `assignedDoctorId` must be an enabled DOCTOR (`ASSIGNED_USER_NOT_DOCTOR`, or `REFERENCED_RESOURCE_NOT_FOUND`); name trimmed; status SCHEDULED; audit.
- **openQueueSession:** lock; SCHEDULED and `sessionDate == today` -> OPEN (`openedAt/By`); OPEN -> no-op; CLOSED -> `QUEUE_SESSION_CLOSED`; other date -> `INVALID_SESSION_DATE`.
- **closeQueueSession:** lock; CLOSED -> no-op; count WAITING/SERVING; > 0 and not `force` -> `QUEUE_SESSION_HAS_ACTIVE_ENTRIES` (`waitingCount`, `servingCount`);
  with force: bulk `UPDATE queue_entries SET status='CANCELLED', cancelled_at=now, cancelled_by=:user, cancel_reason='Session closed' WHERE session=:id AND status='WAITING'` and
  `... status='COMPLETED', completed_at=now, completed_by=:user WHERE status='SERVING'`; then CLOSED; audit `QUEUE_SESSION_CLOSED` with counts.
- **createBooking** (Workflow C): idempotency -> `findByIdForUpdate` (404) -> CLOSED -> `QUEUE_SESSION_CLOSED` -> `lastIssuedNumber == 999` -> `QUEUE_SESSION_FULL` ->
  normalise phone; if phone and not `allowDuplicate` and an entry with status WAITING/SERVING and same phone exists -> `DUPLICATE_BOOKING` (`existingQueueNumber`) ->
  `session.lastIssuedNumber += 1` -> insert entry (number, WAITING, channel, bookedBy, bookedAt) -> `session.touch(now)` (updatedAt; version increments) -> audit `BOOKING_CREATED` -> idempotency complete (201).
- **callNextPatient** (Workflow E): lock session -> CLOSED -> `QUEUE_SESSION_CLOSED`; not OPEN -> `QUEUE_SESSION_NOT_OPEN` ->
  `!Objects.equals(req.expectedLastCalledNumber(), session.getLastCalledNumber())` -> `QUEUE_STATE_CHANGED` (`currentServingNumber`) ->
  if `completeCurrentEntryId`: entry of another session -> `QUEUE_ENTRY_NOT_IN_SESSION`; SERVING -> COMPLETED; COMPLETED -> ignore; other -> `INVALID_STATUS_TRANSITION` ->
  next = lowest WAITING (example query Q8) -> if present: SERVING, `calledAt/By`, `session.lastCalledNumber = next.number` -> `session.touch` -> audits -> `CallNextResponse`.
- **callQueueEntry / completeQueueEntry / skipQueueEntry / requeueQueueEntry / cancelBooking:** lock the entry's session first, check session status
  (CLOSED -> `QUEUE_SESSION_CLOSED`; transitions other than cancel/requeue require OPEN -> `QUEUE_SESSION_NOT_OPEN`; requeue also requires OPEN), apply `QueueEntryStateMachine`
  (table in 10.4), same-state no-op, `session.touch`, audit. `callQueueEntry` sets `session.lastCalledNumber`; `requeue` increments `requeueCount`.
- **getQueueSession / listQueueSessions:** counts via one grouped query; `nextWaitingNumber` = lowest WAITING; `servingEntries` ordered by `calledAt` desc.
- **Public (`PublicQueueService`):** only sessions with `sessionDate >= today` (else 404); returns `PublicQueueStatus` built from numbers only (example query Q9);
  `waitingNumbers` limited to 50; the list endpoint returns today's sessions. These services never load entity fields with personal data into the DTO.

### 10.8 Audit (`audit`)

- `AuditService.record(AuditEvent e)` inserts in the **current** transaction (so a rollback removes it). `details` is a `Map<String,Object>` limited to the keys of the catalogue below; a unit test asserts that no
  `details` key outside the catalogue is ever written. Request id, IP and user agent come from a request-scoped `RequestContext` filled by `RequestIdFilter` (null for scheduled jobs).
- Audited reads use a write transaction for the audit insert. If the insert fails the request fails (no silent loss).
- `listAuditEvents` (ADMIN): filters, range <= 366 days, newest first; writes `AUDIT_LOG_VIEWED`.

Audit action catalogue (enum `AuditAction`):


| Action | Entity type | Sets patient_id | Written when | Allowed details keys |
|---|---|---|---|---|
| `AUTH_LOGIN_SUCCEEDED` | SESSION | no | POST /auth/login 200 | familyId |
| `AUTH_LOGIN_FAILED` | SESSION | no | POST /auth/login 401 (any reason) | reason (INVALID_CREDENTIALS\|ACCOUNT_LOCKED\|ACCOUNT_DISABLED) |
| `AUTH_ACCOUNT_LOCKED` | USER | no | 5th consecutive failure locks the account | lockedUntil |
| `AUTH_LOGOUT` | SESSION | no | POST /auth/logout | familyId |
| `AUTH_REFRESH_REUSE_DETECTED` | SESSION | no | Rotated refresh token reused after grace window; family revoked | familyId |
| `AUTH_PASSWORD_CHANGED` | USER | no | POST /auth/change-password 204 | - |
| `ACCESS_DENIED` | AUDIT | yes | 403 on any endpoint that touches patient or prescription data (outcome DENIED) | method, path, requiredRoles |
| `USER_CREATED` | USER | no | POST /users | username, roles |
| `USER_UPDATED` | USER | no | PUT /users/{id} | changedFields, roles, enabled |
| `USER_PASSWORD_RESET` | USER | no | POST /users/{id}/reset-password | - |
| `PATIENT_CREATED` | PATIENT | yes | POST /patients 201 | patientNumber |
| `PATIENT_UPDATED` | PATIENT | yes | PUT /patients/{id} 200 | changedFields (names only, no values) |
| `PATIENT_VIEWED` | PATIENT | yes | GET /patients/{id}, GET /patients/by-number/{n} 200 | via (ID\|NUMBER) |
| `PATIENT_SEARCHED` | PATIENT | no | GET /patients?search= | search, resultCount |
| `PATIENT_HISTORY_VIEWED` | PATIENT | yes | GET /patients/{id}/medical-history 200 | page, size |
| `CONSULTATION_CREATED` | CONSULTATION | yes | POST /consultations 201 | diagnosisCount, prescriptionId, itemCount, queueEntryId |
| `CONSULTATION_VIEWED` | CONSULTATION | yes | GET /consultations/{id} 200 | - |
| `PRESCRIPTION_CREATED` | PRESCRIPTION | yes | Prescription created with a consultation or via POST /consultations/{id}/prescriptions | prescriptionNumber, itemCount, supersedesPrescriptionId |
| `PRESCRIPTION_VIEWED` | PRESCRIPTION | yes | GET /prescriptions/{id} 200 | - |
| `PRESCRIPTION_STARTED` | PRESCRIPTION | yes | POST /prescriptions/{id}/start (status changed) | fromStatus, toStatus |
| `PRESCRIPTION_DISPENSED` | PRESCRIPTION | yes | POST /prescriptions/{id}/dispense 200 | fromStatus, toStatus, outcome, dispensingId |
| `PRESCRIPTION_CANCELLED` | PRESCRIPTION | yes | POST /prescriptions/{id}/cancel 200 | fromStatus, toStatus (reason text is NOT copied) |
| `MEDICINE_CREATED` | MEDICINE | no | POST /medicines 201 | name, strength, dosageForm |
| `MEDICINE_UPDATED` | MEDICINE | no | PUT /medicines/{id} 200 | changedFields, active |
| `QUEUE_SESSION_CREATED` | QUEUE_SESSION | no | POST /queue-sessions 201 | sessionDate, name |
| `QUEUE_SESSION_OPENED` | QUEUE_SESSION | no | POST /queue-sessions/{id}/open | - |
| `QUEUE_SESSION_CLOSED` | QUEUE_SESSION | no | POST /queue-sessions/{id}/close or nightly auto-close | force, cancelledCount, completedCount, automatic |
| `BOOKING_CREATED` | QUEUE_ENTRY | no | POST /queue-sessions/{id}/entries 201 | queueNumber, channel, duplicateOverride |
| `BOOKING_CANCELLED` | QUEUE_ENTRY | no | POST /queue-entries/{id}/cancel | queueNumber, fromStatus |
| `QUEUE_ENTRY_CALLED` | QUEUE_ENTRY | no | call-next or POST /queue-entries/{id}/call | queueNumber, fromStatus, viaCallNext |
| `QUEUE_ENTRY_COMPLETED` | QUEUE_ENTRY | no | POST /queue-entries/{id}/complete or call-next completeCurrentEntryId | queueNumber |
| `QUEUE_ENTRY_SKIPPED` | QUEUE_ENTRY | no | POST /queue-entries/{id}/skip | queueNumber |
| `QUEUE_ENTRY_REQUEUED` | QUEUE_ENTRY | no | POST /queue-entries/{id}/requeue | queueNumber, requeueCount |
| `AUDIT_LOG_VIEWED` | AUDIT | no | GET /audit-events | filters |
| `RETENTION_JOB_EXECUTED` | AUDIT | no | Nightly retention job | anonymizedQueueEntries, deletedRefreshTokens, deletedIdempotencyKeys, autoClosedSessions |



### 10.9 Retention jobs (`retention`)

`@Scheduled(cron = "0 5 0 * * *", zone = "${app.timezone}")` (00:05 daily), each step in its own transaction, idempotent:
1. Auto-close sessions with `session_date < today` that are not CLOSED (force semantics; audit `QUEUE_SESSION_CLOSED` with `automatic=true`, actor null).
2. Anonymise queue entries (example query Q12) older than `APP_RETENTION_QUEUE_PII_DAYS`.
3. Delete refresh tokens with `expires_at < now - 7 days`; delete idempotency keys with `expires_at < now`.
4. Write `RETENTION_JOB_EXECUTED` with the counts.
With several replicas the jobs may run concurrently; all statements are idempotent, so no distributed lock is required.

## 11. Error handling

- `ErrorCode` enum = the catalogue below (code -> HTTP status, title). `ApiException(ErrorCode code, String detail, Map<String,Object> context, List<FieldError> errors)`; convenience subclasses (`NotFoundException`, `ConflictException`, `BusinessRuleException`).
- `GlobalExceptionHandler` (`@RestControllerAdvice`) returns `ProblemDetail` with `type = https://dms.example/problems/<code-in-kebab-case>`, `title`, `status`, `detail`, `instance` = request path,
  and properties `code`, `requestId`, `timestamp`, `errors`, plus context fields (`existingPatientId`, `currentStatus`, ...). Media type `application/problem+json`.
- Mappings: `MethodArgumentNotValidException`, `HandlerMethodValidationException`, `ConstraintViolationException` -> `VALIDATION_FAILED` (all field errors, JSON paths like `prescription.items[2].quantity`);
  `HttpMessageNotReadableException` (bad JSON, unknown property, bad enum, bad UUID/date) -> `MALFORMED_REQUEST`; `MissingRequestHeaderException` for Idempotency-Key -> `IDEMPOTENCY_KEY_REQUIRED`;
  `NoResourceFoundException` and `HttpRequestMethodNotSupportedException` -> 404 `RESOURCE_NOT_FOUND` (methods outside the contract do not exist);
  `OptimisticLockingFailureException` -> `CONCURRENT_MODIFICATION`; lock timeouts -> `SERVICE_UNAVAILABLE`; `DataIntegrityViolationException` -> section 7.2; anything else -> `INTERNAL_ERROR` (log ERROR with stack trace and requestId; response detail generic).
- `rejectedValue` is included only for non-sensitive fields; never for passwords, `clinicalNotes`, `presentingComplaint`, `conditionText`, `knownAllergies`, notes or reasons.

Error code catalogue (enum `ErrorCode`):


| Code | HTTP | Title | When it is returned |
|---|---|---|---|
| `MALFORMED_REQUEST` | 400 | Malformed request | Body is not valid JSON, has wrong JSON types, or an unknown enum value. |
| `VALIDATION_FAILED` | 400 | Validation failed | Bean Validation (field or cross-field) failed for the body, path or query parameters. errors[] lists every failing field. |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Idempotency key required | A POST that requires the Idempotency-Key header was sent without it, or the key does not match ^[A-Za-z0-9_-]{8,100}$. |
| `UNAUTHENTICATED` | 401 | Authentication required | No bearer token, or the token is malformed or has an invalid signature. |
| `TOKEN_EXPIRED` | 401 | Access token expired | The bearer token is well-formed but expired. Client should call POST /auth/refresh once and retry. |
| `INVALID_CREDENTIALS` | 401 | Invalid credentials | Unknown username or wrong password (same response for both). |
| `ACCOUNT_LOCKED` | 401 | Account temporarily locked | Correct password but the account is locked after 5 consecutive failures. Returned only when the password is correct, so it cannot be used to enumerate users. |
| `ACCOUNT_DISABLED` | 401 | Account disabled | Correct password but the account is disabled. |
| `REFRESH_TOKEN_INVALID` | 401 | Session expired | Refresh cookie missing, unknown, expired or revoked. Client must show the login screen. |
| `REFRESH_TOKEN_ROTATED` | 401 | Refresh token already rotated | Refresh token was rotated less than 30 s ago (parallel refresh from another tab). The browser already holds the new cookie; client retries refresh once after 500 ms. |
| `SESSION_REVOKED` | 401 | Session revoked | A rotated refresh token was reused after the 30 s grace window (possible theft). The whole token family is revoked. |
| `FORBIDDEN` | 403 | Access denied | Authenticated user lacks the role required by the endpoint. |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Password change required | users.must_change_password is TRUE; only GET /auth/me, POST /auth/change-password and POST /auth/logout are allowed. |
| `NOT_RESOURCE_OWNER` | 403 | Not the owner of this resource | Role is sufficient but an ownership rule fails, e.g. a doctor cancels another doctor's prescription. |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found | Unknown route or generic missing resource. |
| `PATIENT_NOT_FOUND` | 404 | Patient not found | No patient with the given id or patient number. For lookup by number the UI offers registration. |
| `CONSULTATION_NOT_FOUND` | 404 | Consultation not found | No consultation with the given id. |
| `PRESCRIPTION_NOT_FOUND` | 404 | Prescription not found | No prescription with the given id. |
| `QUEUE_SESSION_NOT_FOUND` | 404 | Queue session not found | No queue session with the given id. |
| `QUEUE_ENTRY_NOT_FOUND` | 404 | Queue entry not found | No queue entry with the given id. |
| `USER_NOT_FOUND` | 404 | User not found | No user with the given id. |
| `MEDICINE_NOT_FOUND` | 404 | Medicine not found | No medicine with the given id (path parameter). |
| `DUPLICATE_PATIENT_NUMBER` | 409 | Patient number already exists | uq_patients_patient_number violated. errors[0].field = patientNumber; existingPatientId is returned so the UI can open that record. |
| `DUPLICATE_USERNAME` | 409 | Username already exists | uq_users_username violated. |
| `DUPLICATE_MEDICINE` | 409 | Medicine already exists | uq_medicines_name_strength_form violated. |
| `DUPLICATE_QUEUE_SESSION` | 409 | Queue session already exists | uq_queue_sessions_date_name violated. |
| `DUPLICATE_BOOKING` | 409 | Possible duplicate booking | An active (WAITING/SERVING) entry in the same session has the same contact phone and allowDuplicate was not true. existingQueueNumber is returned. |
| `CONCURRENT_MODIFICATION` | 409 | Record changed by someone else | Optimistic-lock version in the request does not match (JPA OptimisticLockException). Client reloads and re-applies. |
| `INVALID_STATUS_TRANSITION` | 409 | Invalid status transition | Requested transition is not allowed from the current status (prescription or queue entry). currentStatus is returned. |
| `QUEUE_STATE_CHANGED` | 409 | Queue changed | call-next expectedLastCalledNumber differs from the session's last_called_number (someone else already called). currentServingNumber is returned; UI refreshes. |
| `QUEUE_SESSION_NOT_OPEN` | 409 | Queue session not open | Calling, completing or skipping requires status OPEN. |
| `QUEUE_SESSION_CLOSED` | 409 | Queue session closed | Booking or any mutation on a CLOSED session. |
| `QUEUE_SESSION_FULL` | 409 | Queue session full | last_issued_number = 999. |
| `QUEUE_SESSION_HAS_ACTIVE_ENTRIES` | 409 | Queue session has active entries | close without force=true while WAITING or SERVING entries exist. waitingCount and servingCount are returned. |
| `QUEUE_ENTRY_ALREADY_LINKED` | 409 | Queue entry already linked | uq_consultations_queue_entry violated: another consultation already references the queue entry. |
| `ACTIVE_PRESCRIPTION_EXISTS` | 409 | Active prescription exists | uq_prescriptions_active_per_consultation violated: the consultation already has a non-cancelled prescription. |
| `REFERENCED_RESOURCE_NOT_FOUND` | 422 | Referenced resource not found | An id inside the request body (patientId, queueEntryId, medicineId, assignedDoctorId, prescriptionItemId, supersedesPrescriptionId) does not exist. errors[0].field names it. |
| `MEDICINE_INACTIVE` | 422 | Medicine is not available | A prescription item references a catalogue medicine with active = false. |
| `CONSULTATION_LOCKED` | 422 | Consultation locked | A prescription is added to a consultation more than 24 h after consultation_at. (A different doctor gets 403 NOT_RESOURCE_OWNER.) |
| `INVALID_SUPERSEDED_PRESCRIPTION` | 422 | Invalid superseded prescription | supersedesPrescriptionId is not a CANCELLED prescription of the same consultation, or is already superseded. |
| `QUEUE_ENTRY_NOT_IN_SESSION` | 422 | Queue entry not in session | completeCurrentEntryId (call-next) or queueEntryId (consultation) refers to an entry of a different session or a non-SERVING entry where SERVING is required. |
| `DISPENSE_ITEMS_MISMATCH` | 422 | Dispense items do not match | items[] must contain every prescription item of the prescription exactly once. |
| `DISPENSE_QUANTITY_EXCEEDS_PRESCRIBED` | 422 | Quantity exceeds prescribed | quantityDispensed &gt; prescribed quantity for an item. |
| `NOTHING_DISPENSED` | 422 | Nothing dispensed | Every item has quantityDispensed = 0. Cancel the prescription instead. |
| `DISPENSE_NOTE_REQUIRED` | 422 | Note required | An item with quantityDispensed below the prescribed quantity has no note. |
| `INVALID_SESSION_DATE` | 422 | Invalid session date | sessionDate is before today or more than 30 days ahead (APP_TIMEZONE). |
| `ASSIGNED_USER_NOT_DOCTOR` | 422 | Assigned user is not a doctor | assignedDoctorId refers to a user without the DOCTOR role or a disabled user. |
| `SELF_MODIFICATION_NOT_ALLOWED` | 422 | Cannot change own account this way | An admin tries to disable themselves or remove their own ADMIN role. |
| `LAST_ADMIN_REQUIRED` | 422 | At least one admin required | The change would leave no enabled user with the ADMIN role. |
| `CURRENT_PASSWORD_INCORRECT` | 422 | Current password incorrect | change-password currentPassword is wrong (422, not 401, so the client does not trigger token refresh). |
| `PASSWORD_POLICY_VIOLATION` | 422 | Password does not meet policy | New password equals the current password, contains the username, or is on the deny-list. |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Idempotency key reused | The same Idempotency-Key was used by the same user for a different operation or a different request body within 24 h. |
| `RATE_LIMITED` | 429 | Too many requests | Rate limit exceeded (login 10/min/IP, public queue 120/min/IP). Retry-After header is set. |
| `INTERNAL_ERROR` | 500 | Internal server error | Unexpected exception. Details are logged server-side with requestId; nothing internal is returned. |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable | Database unreachable, a row lock could not be obtained within lock_timeout (5 s; client may retry), or the application is shutting down. |



## 12. Logging and observability

- Structured console logging (`ecs` in prod). `RequestIdFilter` puts `requestId` and (after authentication) `userId` into the MDC; one access-log line per request at INFO:
  method, path template (not the raw query string), status, duration ms, requestId, userId.
- **Never log:** request or response bodies, passwords, tokens, cookies, `Authorization` headers, clinical notes, presenting complaints, diagnoses, allergies, medicine lists,
  patient names, phone numbers, addresses, booking names or notes. Log entity UUIDs instead. Log query strings only for public endpoints (they contain no PII).
- WARN for rejected logins (username hash, not the username), rate limits and 409/422 at DEBUG; ERROR only for unexpected exceptions and mapping failures.
- Actuator: health groups `liveness` (no DB) and `readiness` (DB); Prometheus metrics; custom counters `dms.queue.bookings`, `dms.queue.calls`, `dms.prescriptions.dispensed` (no PII tags).

## 13. Testing

### 13.1 Strategy and tooling

- Unit tests (`*Test`, Surefire): services with Mockito, state machines, validators, mappers, password policy, clock logic.
- Controller tests (`@WebMvcTest` + `@AutoConfigureMockMvc`, `@MockitoBean` services): validation, status codes, Problem Details, security annotations.
- Integration tests (`*IT`, Failsafe): `@SpringBootTest(webEnvironment = RANDOM_PORT)` against **PostgreSQL 16 Testcontainers** (never H2):

```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {
    @Bean @ServiceConnection
    PostgreSQLContainer postgres() { return new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine")); }
}
```

  Reuse one container per test JVM (`@ImportTestcontainers` / singleton). Tests create their own data through services or repositories with unique patient numbers and session names;
  do not truncate `audit_events` (append-only trigger) - assert on rows filtered by the test's own ids.
- Concurrency tests: `ExecutorService` with N threads, a `CountDownLatch` start gate, each thread performing one HTTP call or service call in its own transaction; assert on the database afterwards.
- Security matrix (BT-003): parse `../docs/openapi.yaml`, and for every operation x {anonymous, ADMIN, DOCTOR, PHARMACIST} send a minimal request and assert 401 / 403 / not-403 according to `x-roles`.
- Coverage gate (JaCoCo, `mvn verify`): >= 80% line coverage for `**/service/**`-like classes (all `*Service`, `*StateMachine`), build fails below.
- ArchUnit rules: layering (section 3), no `Instant.now()`/`LocalDate.now()` outside `BusinessClock`, no entity in controller signatures, every controller method has `@PreAuthorize` or is listed as public.

### 13.2 Required test cases


| ID | Type | Class / file | What it proves | Covers |
|---|---|---|---|---|
| BT-001 | unit | `auth.AuthServiceTest` | Login success, unknown user, wrong password, lockout after 5 failures, ACCOUNT_LOCKED/ACCOUNT_DISABLED only with correct password, counter reset on success | FR-001, FR-005, NFR-008 |
| BT-002 | integration | `auth.RefreshTokenFlowIT` | Refresh rotation; reuse within 30 s -&gt; REFRESH_TOKEN_ROTATED without revocation; reuse after 30 s -&gt; SESSION_REVOKED and family revoked; logout revokes family; X-Requested-With required | FR-002, FR-003, NFR-009 |
| BT-003 | security | `security.EndpointAuthorizationMatrixIT` | Parameterised from openapi.yaml x-roles: every operation x {anonymous, ADMIN, DOCTOR, PHARMACIST} -&gt; 401/403/allowed | FR-006, FR-008, FR-032, NFR-012 |
| BT-004 | security | `security.PasswordChangeRequiredIT` | mustChangePassword user gets 403 PASSWORD_CHANGE_REQUIRED except auth/me, change-password, logout; change-password policy checks and revocation of other families | FR-004 |
| BT-005 | controller | `patient.PatientControllerTest` | Registration validation: patient number normalisation/pattern, DOB xor estimatedAgeYears, future DOB, phone normalisation, field lengths -&gt; 400 VALIDATION_FAILED with errors[] | FR-011, FR-013, FR-014, NFR-013 |
| BT-006 | integration | `patient.PatientRegistrationIT` | Duplicate patient number -&gt; 409 DUPLICATE_PATIENT_NUMBER with existingPatientId, including two concurrent registrations of the same number (exactly one 201) | FR-013 |
| BT-007 | integration | `patient.PatientUpdateIT` | Optimistic locking: stale version -&gt; 409 CONCURRENT_MODIFICATION; patientNumber immutable; estimated DOB preserved | FR-015 |
| BT-008 | integration | `patient.MedicalHistoryIT` | History ordering (newest first), paging, cancelled prescriptions included, conditions summary grouping; Hibernate statistics prove &lt;= 8 SQL statements per page (no N+1) | FR-016 |
| BT-009 | integration | `consultation.ConsultationCreationIT` | Atomic create: failure in any item (e.g. inactive medicine at item 3) leaves no consultation, diagnosis, prescription or item rows; prescription appears as PENDING | FR-017, FR-020, FR-021, FR-024, NFR-017 |
| BT-010 | integration | `common.IdempotencyIT` | Same key + same body -&gt; replay (same id, same status, no second row); same key + different body -&gt; 422 IDEMPOTENCY_KEY_REUSED; 10 parallel identical requests -&gt; 1 row; missing header -&gt; 400 | FR-013, FR-020, FR-029, FR-036, FR-048 |
| BT-011 | controller | `consultation.ConsultationControllerTest` | Item rules: medicineId with medicineName -&gt; 400; neither -&gt; 400; inactive -&gt; 422 MEDICINE_INACTIVE; unknown medicineId/patientId -&gt; 422 REFERENCED_RESOURCE_NOT_FOUND; 1-10 diagnoses, 1-30 items, quantity scale | FR-018, FR-019, NFR-013 |
| BT-012 | unit | `prescription.PrescriptionStateMachineTest` | Exhaustive transition table for PENDING/IN_PROGRESS/DISPENSED/CANCELLED x {start, dispense, cancel}; same-state no-ops; terminal states never change | FR-027, FR-030 |
| BT-013 | concurrency | `pharmacy.DispenseConcurrencyIT` | 10 threads dispense the same prescription with different keys -&gt; exactly one dispensing row, others 409 INVALID_STATUS_TRANSITION; cancel vs dispense race -&gt; one wins | FR-029, NFR-017, NFR-018 |
| BT-014 | unit | `pharmacy.DispenseServiceTest` | Item set mismatch, quantity &gt; prescribed, all zero (NOTHING_DISPENSED), missing note, derived item status and outcome FULL/PARTIAL, BigDecimal scale handling | FR-028 |
| BT-015 | integration | `prescription.PrescriptionCancelIT` | Doctor can cancel only own prescriptions (403 NOT_RESOURCE_OWNER); pharmacist any; reason required; DISPENSED -&gt; 409 | FR-030 |
| BT-016 | integration | `prescription.AddPrescriptionIT` | Re-issue: active exists -&gt; 409; &gt; 24 h -&gt; 422 CONSULTATION_LOCKED; supersedes must be cancelled & same consultation & not already superseded; supersededByPrescriptionId populated | FR-031 |
| BT-017 | concurrency | `queue.BookingNumberConcurrencyIT` | 100 concurrent bookings -&gt; numbers 1..100 unique and gap-free; failed transactions leave no gaps; 999 limit -&gt; QUEUE_SESSION_FULL | FR-036, NFR-017, NFR-018 |
| BT-018 | integration | `queue.DuplicateBookingIT` | Same normalised phone in active entry -&gt; 409 DUPLICATE_BOOKING with existingQueueNumber; allowDuplicate=true -&gt; 201; completed/cancelled entries do not count | FR-037 |
| BT-019 | concurrency | `queue.CallNextConcurrencyIT` | Two concurrent call-next with the same expectedLastCalledNumber -&gt; one 200, one 409 QUEUE_STATE_CHANGED; no WAITING entry skipped; completeCurrentEntryId semantics; empty queue -&gt; calledEntry null | FR-039, NFR-018 |
| BT-020 | unit | `queue.QueueEntryStateMachineTest` | Exhaustive queue-entry transition table (call, complete, skip, requeue, cancel) incl. same-state no-ops and session status preconditions | FR-038, FR-040, FR-041 |
| BT-021 | integration | `queue.QueueSessionLifecycleIT` | Create date window, unique name per date, open only today, close without force -&gt; 409 with counts, force cancels WAITING and completes SERVING, nightly auto-close | FR-034, FR-035, FR-050 |
| BT-022 | security | `queue.PublicQueuePrivacyIT` | Public responses contain exactly the documented keys (JSON key whitelist); seeded names/phones/patient numbers never appear in the body; past sessions -&gt; 404; no auth required | FR-043, FR-044, NFR-011 |
| BT-023 | controller | `queue.PublicQueueEtagTest` | ETag changes on every queue mutation; If-None-Match -&gt; 304 with empty body; Cache-Control no-cache | FR-042, FR-044, NFR-003 |
| BT-024 | integration | `audit.AuditTrailIT` | Each action in the AuditAction catalogue is written with correct entity/patient ids and outcome; details contain no clinical text; UPDATE/DELETE on audit_events rejected by trigger | FR-046, FR-047, NFR-026 |
| BT-025 | repository | `db.FlywayMigrationIT` | Clean PostgreSQL 16 Testcontainer: all migrations apply; hibernate ddl-auto=validate passes; seed migration only in dev profile | NFR-020 |
| BT-026 | repository | `queue.QueueEntryRepositoryIT` | Repository queries: next waiting entry, counts by status, active phone lookup, history batch loaders, prescription list filters | FR-012, FR-025 |
| BT-027 | controller | `common.ProblemDetailsTest` | Every error is application/problem+json with type, title, status, code, requestId, timestamp; unknown route -&gt; 404 RESOURCE_NOT_FOUND; unexpected exception -&gt; 500 without stack trace | FR-020, NFR-019 |
| BT-028 | integration | `common.LogRedactionIT` | Captured logs during login, consultation and dispense flows contain no password, token, Authorization header, clinical notes or diagnosis text | NFR-008, NFR-010 |
| BT-029 | contract | `contract.OpenApiContractIT` | Generated /v3/api-docs has exactly the paths, methods and response status codes of docs/openapi.yaml; sample responses validate against openapi.yaml schemas | FR-023, FR-049, NFR-022 |
| BT-030 | integration | `security.RateLimitIT` | Login &gt; APP_RATE_LIMIT_LOGIN_PER_MINUTE and public &gt; APP_RATE_LIMIT_PUBLIC_PER_MINUTE -&gt; 429 RATE_LIMITED with Retry-After | NFR-025 |
| BT-031 | integration | `retention.RetentionJobIT` | Queue PII anonymised after APP_RETENTION_QUEUE_PII_DAYS; expired refresh tokens (&gt; 7 days) and idempotency keys deleted; audit row written | FR-050 |
| BT-032 | integration | `user.UserAdministrationIT` | Create/update/disable/reset; SELF_MODIFICATION_NOT_ALLOWED; LAST_ADMIN_REQUIRED; disabling revokes refresh tokens; bootstrap admin created only when users table is empty | FR-007, FR-009 |
| BT-033 | unit | `common.BusinessClockTest` | Today, session-date window, age and estimated DOB computed in APP_TIMEZONE using an injected Clock (midnight boundary cases) | FR-014, NFR-024 |
| BT-034 | integration | `medicine.MedicineCatalogIT` | Create/update/deactivate; case-insensitive uniqueness -&gt; 409 DUPLICATE_MEDICINE; search; deactivation does not affect existing prescriptions | FR-033 |
| BT-035 | security | `security.MedicalDataExposureIT` | PHARMACIST cannot call medical-history, patient or consultation endpoints (403 + ACCESS_DENIED audit); prescription detail contains no diagnoses or clinical notes | FR-006, FR-026, NFR-012 |



### 13.3 Key assertions (minimum)

- BT-017: 100 parallel `createBooking` calls with distinct keys -> HTTP 201 x100, `queue_number` set = {1..100}, `last_issued_number = 100`.
- BT-019: with entries 1..5 WAITING, two concurrent `call-next` with `expectedLastCalledNumber = null` -> exactly one 200 (calls 1) and one 409 QUEUE_STATE_CHANGED (`currentServingNumber = 1`); entry 2 still WAITING.
- BT-013: 10 parallel `dispense` with different keys -> 1 x 200, 9 x 409, one `dispensings` row; with the same key -> 10 x 200, one row.
- BT-022: the JSON of `getPublicQueueStatus` has exactly the keys of `PublicQueueStatus`; seeded names/phones (`Ishara`, `0759876543`, `P-0001`) do not occur anywhere in the body.
- BT-009: a request whose 3rd item references an inactive medicine returns 422 and `select count(*)` on consultations/diagnoses/prescriptions/items is unchanged.

### 13.4 Prescription state-transition tests (BT-012)

Parameterised over every (status, action) pair of the table in 10.4: expected new status, no-op, or `INVALID_STATUS_TRANSITION`. The same is done for queue entries (BT-020).

### 13.5 Contract test (BT-029)

Fetch `/v3/api-docs` (test profile enables springdoc) and compare with `../docs/openapi.yaml`: identical set of (path, method); for each operation identical set of
documented status codes; every schema name of the contract exists. In addition, responses captured by the integration tests are validated against the contract
schemas with `json-schema-validator` (OpenAPI 3.1 schemas are JSON Schema 2020-12).

### 13.6 Performance assets (NFR-001..003)

- `perf/generate-perf-data.sql`: generates 50 000 patients, 500 000 consultations (1-3 diagnoses each), 300 000 prescriptions with 1 000 000 items, 60 days of sessions with 300 entries/day, using `generate_series`; deterministic (`setseed(0.42)`).
- `perf/staff-reads.js`, `perf/staff-writes.js`, `perf/public-queue.js` (k6): thresholds exactly as in NFR-001..003 (`http_req_duration{expected_response:true}` p(95)/p(99)), 10-minute steady state, 25 VUs staff / 50 rps public.
- Run: `k6 run -e BASE_URL=http://localhost:8080 perf/staff-reads.js` (not part of `mvn verify`).

## 14. Implementation conventions (mandatory)

1. `BigDecimal` for `quantity` and `quantityDispensed` (scale 2, compare with `compareTo`); never `float`/`double` for quantities or money.
2. `Instant` for timestamps (UTC), `LocalDate` for dates, `Duration` for TTLs; `BusinessClock` for "now"/"today".
3. DTO records at the API boundary; JPA entities never leave the service layer.
4. No N+1 queries (section 6.4); `open-in-view=false`.
5. Secrets only from environment variables; no secrets, real passwords or tokens in source, tests (except the documented dev password), logs or Docker images.
6. Related writes in one `@Transactional` service method; no partial persistence.
7. Never swallow exceptions: no empty `catch`; either handle with a defined outcome or rethrow; the global handler logs unexpected ones once.
8. PostgreSQL is the only source of truth; in-memory structures only for rate-limit buckets and caches of immutable data (deny-list file).
9. Logs without passwords, tokens or unnecessary patient data (section 12).
10. Use constructor injection; `final` fields; no field injection.
11. Use `Objects.requireNonNull` / explicit validation rather than relying on NPEs.
12. Code, identifiers and messages in English; API messages short and neutral (no internal details).

## 15. Completion criteria

### 15.1 Commands

```bash
# build + all tests (unit + integration with Testcontainers; Docker must be running)
cd backend && ./mvnw clean verify

# unit tests only
./mvnw test

# run locally against the Compose database (from repo root: docker compose up -d db)
export $(grep -v '^#' ../.env | xargs) && export DB_URL=jdbc:postgresql://localhost:5432/dms
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# whole stack
cd .. && cp .env.example .env && docker compose up --build

# database migrations: applied automatically at startup by Flyway (spring.flyway.*).
# inspect state:
docker compose exec db psql -U dms -d dms -c "select version, description, success from flyway_schema_history order by installed_rank"
```

- Swagger UI (dev): <http://localhost:8080/swagger-ui.html>; OpenAPI JSON: <http://localhost:8080/v3/api-docs>.
- Health: <http://localhost:8080/actuator/health>, `/actuator/health/liveness`, `/actuator/health/readiness`.
- Login with `dr.perera` / `DevPassword#2026` (dev seed) via `POST /api/v1/auth/login`.

### 15.2 Required environment variables

`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `APP_JWT_SECRET` (all others have defaults; see 4.3). Production additionally needs a proper `APP_TIMEZONE`, `APP_REFRESH_COOKIE_SECURE=true` (default) and the bootstrap admin variables for the first start.

### 15.3 Definition of done

- [ ] `./mvnw clean verify` passes, including all `BT-*` tests listed in 13.2 and the coverage gate.
- [ ] `docker compose up --build` starts db, backend and frontend; backend readiness UP within 2 minutes; seed users can log in.
- [ ] `/v3/api-docs` matches `docs/openapi.yaml` (BT-029); Swagger UI lists all 49 operations.
- [ ] Every operation in 8.1 is implemented with the specified authorisation, status codes and error codes.
- [ ] No endpoint, field, table or status exists that is not in the contract or the migration.
- [ ] Logs reviewed: no PII or secrets during the BT-028 flows.

### 15.4 Functional requirement checklist

- [ ] **FR-001** Staff login - ops: `login`; tests: BT-001
- [ ] **FR-002** Session refresh with rotation - ops: `refreshToken`; tests: BT-002
- [ ] **FR-003** Logout - ops: `logout`; tests: BT-002
- [ ] **FR-004** Password change and forced change - ops: `changePassword`, `getCurrentUser`; tests: BT-004
- [ ] **FR-005** Account lockout - ops: `login`; tests: BT-001
- [ ] **FR-006** Role-based access control - ops: `getCurrentUser`; tests: BT-003, BT-035
- [ ] **FR-007** Staff account administration - ops: `listUsers`, `createUser`, `getUser`, `updateUser`, `resetUserPassword`; tests: BT-032
- [ ] **FR-008** Staff directory - ops: `listStaff`; tests: BT-003
- [ ] **FR-009** Bootstrap administrator - ops: no endpoint; tests: BT-032
- [ ] **FR-010** Idle logout on shared workstations - ops: `logout`; tests: -
- [ ] **FR-011** Look up patient by patient number - ops: `getPatientByNumber`; tests: BT-005
- [ ] **FR-012** Search patients - ops: `searchPatients`; tests: BT-026
- [ ] **FR-013** Register new patient - ops: `createPatient`; tests: BT-005, BT-006, BT-010
- [ ] **FR-014** Unknown date of birth - ops: `createPatient`, `updatePatient`; tests: BT-005, BT-033
- [ ] **FR-015** Update patient demographics - ops: `updatePatient`, `getPatient`; tests: BT-007
- [ ] **FR-016** View medical history - ops: `getMedicalHistory`; tests: BT-008
- [ ] **FR-017** Record a consultation - ops: `createConsultation`; tests: BT-009
- [ ] **FR-018** Multi-medicine prescription - ops: `createConsultation`; tests: BT-011
- [ ] **FR-019** Catalogue and free-text medicines - ops: `createConsultation`, `listMedicines`; tests: BT-011
- [ ] **FR-020** Atomic consultation submission - ops: `createConsultation`; tests: BT-009, BT-010, BT-027
- [ ] **FR-021** Automatic routing to the pharmacist queue - ops: `createConsultation`, `listPrescriptions`; tests: BT-009
- [ ] **FR-022** Submission confirmation and consultation detail - ops: `getConsultation`; tests: -
- [ ] **FR-023** Immutable clinical history - ops: no endpoint; tests: BT-029
- [ ] **FR-024** Link consultation to queue entry - ops: `createConsultation`, `getQueueEntry`; tests: BT-009
- [ ] **FR-025** Pharmacist prescription queue - ops: `listPrescriptions`; tests: BT-026
- [ ] **FR-026** Prescription detail for dispensing - ops: `getPrescription`; tests: BT-035
- [ ] **FR-027** Mark in progress - ops: `startPrescription`; tests: BT-012
- [ ] **FR-028** Dispense with per-item record - ops: `dispensePrescription`; tests: BT-014
- [ ] **FR-029** Exactly-once dispensing - ops: `dispensePrescription`; tests: BT-013, BT-010
- [ ] **FR-030** Cancel prescription - ops: `cancelPrescription`; tests: BT-015, BT-012
- [ ] **FR-031** Add or re-issue a prescription - ops: `addPrescriptionToConsultation`; tests: BT-016
- [ ] **FR-032** Doctor sees dispensing status - ops: `listPrescriptions`, `getConsultation`, `getMedicalHistory`; tests: BT-003
- [ ] **FR-033** Medicine catalogue management - ops: `listMedicines`, `createMedicine`, `getMedicine`, `updateMedicine`; tests: BT-034
- [ ] **FR-034** Create queue session - ops: `createQueueSession`, `listQueueSessions`, `listStaff`; tests: BT-021
- [ ] **FR-035** Open and close session - ops: `openQueueSession`, `closeQueueSession`; tests: BT-021
- [ ] **FR-036** Telephone and walk-in booking - ops: `createBooking`; tests: BT-017, BT-010
- [ ] **FR-037** Duplicate booking warning - ops: `createBooking`; tests: BT-018
- [ ] **FR-038** Cancel booking - ops: `cancelBooking`; tests: BT-020
- [ ] **FR-039** Call next patient (doctor's queue button) - ops: `callNextPatient`; tests: BT-019
- [ ] **FR-040** Call a specific patient - ops: `callQueueEntry`; tests: BT-020
- [ ] **FR-041** Complete, skip and requeue - ops: `completeQueueEntry`, `skipQueueEntry`, `requeueQueueEntry`; tests: BT-020
- [ ] **FR-042** Staff queue status - ops: `getQueueSession`, `listQueueEntries`; tests: BT-023
- [ ] **FR-043** Public list of today's queues - ops: `listPublicQueueSessions`; tests: BT-022
- [ ] **FR-044** Public queue display - ops: `getPublicQueueStatus`; tests: BT-022, BT-023
- [ ] **FR-045** Position helper for patients - ops: `getPublicQueueStatus`; tests: -
- [ ] **FR-046** Audit trail - ops: no endpoint; tests: BT-024
- [ ] **FR-047** Audit log viewer - ops: `listAuditEvents`; tests: BT-024
- [ ] **FR-048** Idempotent create operations - ops: `createPatient`, `createConsultation`, `addPrescriptionToConsultation`, `createBooking`, `dispensePrescription`; tests: BT-010
- [ ] **FR-049** Health checks - ops: `health`, `healthLiveness`, `healthReadiness`; tests: BT-029
- [ ] **FR-050** Retention and housekeeping jobs - ops: no endpoint; tests: BT-031, BT-021


### 15.5 Known limitations and deferred features (do not implement)

- No inventory/stock, no owed-item tracking after partial dispensing (BR-D-07).
- No patient accounts, self-booking or notifications; bookings are staff-entered.
- No consultation editing or addenda; no patient deletion, merge or patient-number correction endpoint.
- No printing/PDF generation; no reports module.
- Real-time updates by polling only (no SSE/WebSocket).
- Rate limiting is per instance (in memory).
- Single dispensary (no branches); English messages only.
- Retention periods are defaults pending owner confirmation (SRS Q-09).
