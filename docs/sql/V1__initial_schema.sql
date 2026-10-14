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
