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
