-- name: Q1 Look up a patient by patient number (exact, normalised to upper case)
-- Used by GET /api/v1/patients/by-number/{patientNumber}. Index: uq_patients_patient_number.
SELECT id, patient_number, full_name, sex, date_of_birth, date_of_birth_estimated,
       date_part('year', age(current_date, date_of_birth))::int AS age_years
FROM patients
WHERE patient_number = upper(btrim('p-0001'));

-- name: Q2 Search patients by name fragment, phone or patient-number prefix
-- Used by GET /api/v1/patients?search=. Index: ix_patients_full_name_trgm (ILIKE), uq_patients_patient_number (prefix).
SELECT id, patient_number, full_name, sex, date_of_birth
FROM patients
WHERE full_name ILIKE '%' || 'kumara' || '%'
   OR patient_number LIKE upper('kumara') || '%'
   OR phone_number = regexp_replace('kumara', '[\s()-]', '', 'g')
ORDER BY full_name, patient_number
LIMIT 20 OFFSET 0;

-- name: Q3 Medical history, step 1: one page of consultations, newest first
-- Used by GET /api/v1/patients/{patientId}/medical-history. Index: ix_consultations_patient_at.
SELECT c.id, c.consultation_at, c.presenting_complaint, c.clinical_notes, u.full_name AS doctor_name
FROM consultations c
JOIN users u ON u.id = c.doctor_id
WHERE c.patient_id = '20000000-0000-4000-8000-000000000001'
ORDER BY c.consultation_at DESC, c.id
LIMIT 10 OFFSET 0;

-- name: Q4 Medical history, step 2: batch-load prescriptions, items and dispensing for the page (no N+1)
-- The id list comes from Q3. Diagnoses are batch-loaded the same way (WHERE consultation_id = ANY(:ids)).
SELECT p.consultation_id, p.id AS prescription_id, p.prescription_number, p.status,
       pi.line_number, pi.medicine_name, pi.strength, pi.dose, pi.frequency, pi.quantity, pi.quantity_unit,
       d.outcome AS dispensing_outcome, d.dispensed_at, di.quantity_dispensed, di.status AS item_dispense_status
FROM prescriptions p
JOIN prescription_items pi ON pi.prescription_id = p.id
LEFT JOIN dispensings d ON d.prescription_id = p.id
LEFT JOIN dispensing_items di ON di.prescription_item_id = pi.id
WHERE p.consultation_id = ANY (ARRAY['40000000-0000-4000-8000-000000000001',
                                     '40000000-0000-4000-8000-000000000002']::uuid[])
ORDER BY p.consultation_id, p.submitted_at DESC, pi.line_number;

-- name: Q5 Previous medical conditions summary for a patient
-- Used for MedicalHistoryResponse.conditions.
SELECT min(cd.condition_text)               AS condition_text,
       max(cd.icd10_code)                   AS icd10_code,
       max(c.consultation_at)               AS last_recorded_at,
       count(*)                             AS occurrences
FROM consultation_diagnoses cd
JOIN consultations c ON c.id = cd.consultation_id
WHERE c.patient_id = '20000000-0000-4000-8000-000000000001'
GROUP BY lower(btrim(cd.condition_text))
ORDER BY last_recorded_at DESC
LIMIT 50;

-- name: Q6 Pharmacist queue: active prescriptions, oldest first
-- Used by GET /api/v1/prescriptions?status=PENDING&status=IN_PROGRESS. Index: ix_prescriptions_status_submitted.
SELECT p.id, p.prescription_number, p.consultation_id, p.status, p.submitted_at,
       pt.patient_number, pt.full_name AS patient_name, u.full_name AS prescribed_by,
       (SELECT count(*) FROM prescription_items pi WHERE pi.prescription_id = p.id) AS item_count
FROM prescriptions p
JOIN patients pt ON pt.id = p.patient_id
JOIN consultations c ON c.id = p.consultation_id
JOIN users u ON u.id = c.doctor_id
WHERE p.status IN ('PENDING', 'IN_PROGRESS')
ORDER BY p.submitted_at ASC, p.id
LIMIT 20 OFFSET 0;

-- name: Q7 Issue the next queue number (inside the booking transaction)
-- The UPDATE takes a row lock on the session; concurrent bookings queue behind it. If the
-- transaction rolls back, the increment rolls back too, so numbers stay gap-free.
BEGIN;
SELECT id, status, last_issued_number FROM queue_sessions
WHERE id = '30000000-0000-4000-8000-000000000001' FOR UPDATE;
UPDATE queue_sessions
   SET last_issued_number = last_issued_number + 1, updated_at = now(), version = version + 1
 WHERE id = '30000000-0000-4000-8000-000000000001'
   AND status IN ('SCHEDULED', 'OPEN')
   AND last_issued_number < 999
RETURNING last_issued_number;
ROLLBACK;

-- name: Q8 Call next: pick the lowest waiting number (inside the call-next transaction)
-- Preceded by SELECT ... FOR UPDATE on the session row, so no SKIP LOCKED is needed.
-- Index: ix_queue_entries_session_status_number.
SELECT id, queue_number
FROM queue_entries
WHERE queue_session_id = '30000000-0000-4000-8000-000000000001'
  AND status = 'WAITING'
ORDER BY queue_number
LIMIT 1;

-- name: Q9 Public queue status (no personal data selected)
-- Used by GET /api/v1/public/queue-sessions/{id}.
SELECT s.id, s.name, s.session_date, s.status, s.last_called_number AS current_serving_number,
       s.last_issued_number, s.version, s.updated_at,
       (SELECT coalesce(array_agg(e.queue_number ORDER BY e.queue_number), '{}')
          FROM queue_entries e WHERE e.queue_session_id = s.id AND e.status = 'SERVING') AS serving_numbers,
       (SELECT count(*) FROM queue_entries e WHERE e.queue_session_id = s.id AND e.status = 'WAITING') AS waiting_count,
       (SELECT coalesce(array_agg(n ORDER BY n), '{}') FROM (
            SELECT e.queue_number AS n FROM queue_entries e
             WHERE e.queue_session_id = s.id AND e.status = 'WAITING'
             ORDER BY e.queue_number LIMIT 50) w) AS waiting_numbers
FROM queue_sessions s
WHERE s.id = '30000000-0000-4000-8000-000000000001';

-- name: Q10 Who accessed a patient's record (audit report)
-- Used by GET /api/v1/audit-events?patientId=. Index: ix_audit_events_patient.
SELECT a.occurred_at, a.actor_username, a.action, a.outcome, a.ip_address
FROM audit_events a
WHERE a.patient_id = '20000000-0000-4000-8000-000000000001'
ORDER BY a.occurred_at DESC
LIMIT 50;

-- name: Q11 Prescriptions dispensed by each pharmacist today (dispensary time zone)
SELECT u.full_name AS pharmacist, d.outcome, count(*) AS dispensed
FROM dispensings d
JOIN users u ON u.id = d.pharmacist_id
WHERE (d.dispensed_at AT TIME ZONE 'Asia/Colombo')::date = (now() AT TIME ZONE 'Asia/Colombo')::date
GROUP BY u.full_name, d.outcome
ORDER BY u.full_name, d.outcome;

-- name: Q12 Retention job: anonymise queue entries older than 90 days
UPDATE queue_entries
   SET patient_name = NULL, contact_phone = NULL, notes = NULL,
       anonymized_at = now(), updated_at = now(), version = version + 1
 WHERE anonymized_at IS NULL
   AND booked_at < now() - INTERVAL '90 days'
   AND status IN ('COMPLETED', 'SKIPPED', 'CANCELLED');
