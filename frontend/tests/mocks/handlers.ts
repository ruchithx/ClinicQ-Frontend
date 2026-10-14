import { http, HttpResponse } from 'msw';

// ---- Mock IDs (valid v4 UUIDs) ----
export const MOCK_USER_ID = 'a1000000-0000-4000-8000-000000000001';
export const MOCK_PHARMACIST_ID = 'a1000000-0000-4000-8000-000000000002';
export const MOCK_ADMIN_ID = 'a1000000-0000-4000-8000-000000000003';
export const MOCK_PATIENT_ID = 'b2000000-0000-4000-8000-000000000010';
export const MOCK_CONSULTATION_ID = 'c3000000-0000-4000-8000-000000000020';
export const MOCK_PRESCRIPTION_ID = 'd4000000-0000-4000-8000-000000000030';
export const MOCK_PRESCRIPTION_ITEM_ID = 'd4000000-0000-4000-8000-000000000031';
export const MOCK_MEDICINE_ID = 'e5000000-0000-4000-8000-000000000040';
export const MOCK_QUEUE_SESSION_ID = 'f6000000-0000-4000-8000-000000000050';
export const MOCK_QUEUE_ENTRY_ID = 'f6000000-0000-4000-8000-000000000060';
export const MOCK_AUDIT_EVENT_ID = 'f7000000-0000-4000-8000-000000000070';

// ---- Mock data ----

export const MOCK_DOCTOR_USER = {
  id: MOCK_USER_ID,
  username: 'doctor1',
  fullName: 'Dr Jane Smith',
  roles: ['DOCTOR'] as string[],
  mustChangePassword: false,
};

export const MOCK_PHARMACIST_USER = {
  id: MOCK_PHARMACIST_ID,
  username: 'pharma1',
  fullName: 'Pharma User',
  roles: ['PHARMACIST'] as string[],
  mustChangePassword: false,
  enabled: true,
  professionalRegistrationNumber: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 1,
};

export const MOCK_USER_RESPONSE = {
  id: MOCK_USER_ID,
  username: 'doctor1',
  fullName: 'Dr Jane Smith',
  roles: ['DOCTOR'] as string[],
  enabled: true,
  mustChangePassword: false,
  professionalRegistrationNumber: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 1,
};

export const MOCK_TOKEN_RESPONSE = {
  accessToken: 'test-access-token',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  user: MOCK_DOCTOR_USER,
};

export const MOCK_PATIENT = {
  id: MOCK_PATIENT_ID,
  patientNumber: 'P-001',
  fullName: 'John Patient',
  sex: 'MALE' as const,
  dateOfBirth: '1985-03-15',
  dateOfBirthEstimated: false,
  ageYears: 41,
  phoneNumber: '+94771234567',
  address: '123 Main St',
  knownAllergies: 'Penicillin',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 1,
};

export const MOCK_PATIENT_SUMMARY = {
  id: MOCK_PATIENT_ID,
  patientNumber: 'P-001',
  fullName: 'John Patient',
  sex: 'MALE' as const,
  dateOfBirth: '1985-03-15',
  dateOfBirthEstimated: false,
  ageYears: 41,
  phoneNumber: '+94771234567',
};

export const MOCK_PRESCRIPTION_ITEM = {
  id: MOCK_PRESCRIPTION_ITEM_ID,
  lineNumber: 1,
  medicineId: MOCK_MEDICINE_ID,
  medicineName: 'Paracetamol',
  strength: '500mg',
  dosageForm: 'TABLET' as const,
  dose: '1 tablet',
  frequency: 'TDS',
  durationDays: 5,
  quantity: 15,
  quantityUnit: 'tablets',
  instructions: 'After meals',
};

export const MOCK_PRESCRIPTION = {
  id: MOCK_PRESCRIPTION_ID,
  prescriptionNumber: 'RX-000001',
  consultationId: MOCK_CONSULTATION_ID,
  consultationAt: '2026-10-13T09:00:00Z',
  status: 'PENDING' as const,
  notes: null,
  submittedAt: '2026-10-13T09:01:00Z',
  prescribedBy: { id: MOCK_USER_ID, fullName: 'Dr Jane Smith' },
  patient: {
    id: MOCK_PATIENT_ID,
    patientNumber: 'P-001',
    fullName: 'John Patient',
    sex: 'MALE' as const,
    ageYears: 41,
    dateOfBirthEstimated: false,
    knownAllergies: 'Penicillin',
  },
  items: [MOCK_PRESCRIPTION_ITEM],
  startedAt: null,
  startedBy: null,
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  supersedesPrescriptionId: null,
  supersededByPrescriptionId: null,
  dispensing: null,
  version: 1,
};

export const MOCK_PRESCRIPTION_SUMMARY = {
  id: MOCK_PRESCRIPTION_ID,
  prescriptionNumber: 'RX-000001',
  consultationId: MOCK_CONSULTATION_ID,
  status: 'PENDING' as const,
  patient: { id: MOCK_PATIENT_ID, patientNumber: 'P-001', fullName: 'John Patient' },
  prescribedBy: { id: MOCK_USER_ID, fullName: 'Dr Jane Smith' },
  submittedAt: '2026-10-13T09:01:00Z',
  itemCount: 1,
  startedBy: null,
  dispensingOutcome: null,
  dispensedAt: null,
};

export const MOCK_CONSULTATION = {
  id: MOCK_CONSULTATION_ID,
  patient: { id: MOCK_PATIENT_ID, patientNumber: 'P-001', fullName: 'John Patient' },
  doctor: { id: MOCK_USER_ID, fullName: 'Dr Jane Smith' },
  queueEntryId: null,
  consultationAt: '2026-10-13T09:00:00Z',
  presentingComplaint: 'Headache and fever',
  clinicalNotes: 'Patient appears unwell',
  diagnoses: [{ id: 'c3000000-0000-4000-8000-000000000021', lineNumber: 1, conditionText: 'Viral fever', icd10Code: 'A09' }],
  prescriptions: [MOCK_PRESCRIPTION],
  createdAt: '2026-10-13T09:00:00Z',
};

export const MOCK_MEDICINE = {
  id: MOCK_MEDICINE_ID,
  name: 'Paracetamol',
  strength: '500mg',
  dosageForm: 'TABLET' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 1,
};

export const MOCK_QUEUE_SESSION = {
  id: MOCK_QUEUE_SESSION_ID,
  sessionDate: '2026-10-13',
  name: 'Morning Clinic',
  status: 'OPEN' as const,
  assignedDoctor: { id: MOCK_USER_ID, fullName: 'Dr Jane Smith' },
  lastIssuedNumber: 5,
  currentServingNumber: 3,
  nextWaitingNumber: 4,
  counts: { waiting: 2, serving: 1, completed: 2, skipped: 0, cancelled: 0 },
  servingEntries: [{ id: MOCK_QUEUE_ENTRY_ID, queueNumber: 3, patientName: 'John Patient', calledAt: '2026-10-13T09:30:00Z', calledBy: null }],
  openedAt: '2026-10-13T08:00:00Z',
  closedAt: null,
  createdAt: '2026-10-12T20:00:00Z',
  updatedAt: '2026-10-13T09:30:00Z',
  version: 5,
};

export const MOCK_QUEUE_ENTRY = {
  id: MOCK_QUEUE_ENTRY_ID,
  queueSessionId: MOCK_QUEUE_SESSION_ID,
  queueNumber: 4,
  status: 'WAITING' as const,
  channel: 'WALK_IN' as const,
  patientName: 'Alice Booking',
  contactPhone: null,
  notes: null,
  bookedAt: '2026-10-13T09:00:00Z',
  bookedBy: { id: MOCK_USER_ID, fullName: 'Dr Jane Smith' },
  calledAt: null,
  calledBy: null,
  completedAt: null,
  skippedAt: null,
  skipReason: null,
  cancelledAt: null,
  cancelReason: null,
  requeueCount: 0,
  version: 1,
};

export const MOCK_PUBLIC_SESSION_SUMMARY = {
  id: MOCK_QUEUE_SESSION_ID,
  name: 'Morning Clinic',
  sessionDate: '2026-10-13',
  status: 'OPEN' as const,
  currentServingNumber: 3,
  waitingCount: 2,
};

export const MOCK_PUBLIC_QUEUE_STATUS = {
  id: MOCK_QUEUE_SESSION_ID,
  name: 'Morning Clinic',
  sessionDate: '2026-10-13',
  status: 'OPEN' as const,
  currentServingNumber: 3,
  servingNumbers: [3],
  waitingCount: 2,
  waitingNumbers: [4, 5],
  lastIssuedNumber: 5,
  updatedAt: '2026-10-13T09:30:00Z',
};

export const MOCK_AUDIT_EVENT = {
  id: MOCK_AUDIT_EVENT_ID,
  occurredAt: '2026-10-13T09:00:00Z',
  actor: { id: MOCK_USER_ID, username: 'doctor1', fullName: 'Dr Jane Smith' },
  action: 'LOGIN',
  entityType: 'User',
  entityId: MOCK_USER_ID,
  patientId: null,
  outcome: 'SUCCESS' as const,
  details: {},
  requestId: 'req-001',
  ipAddress: '127.0.0.1',
};

export const MOCK_MEDICAL_HISTORY = {
  conditions: [
    { conditionText: 'Hypertension', icd10Code: 'I10', lastRecordedAt: '2026-10-13T09:00:00Z', occurrences: 3 },
  ],
  consultations: {
    items: [MOCK_CONSULTATION],
    page: 0,
    size: 20,
    totalItems: 1,
    totalPages: 1,
  },
};

// ---- Handlers ----

export const handlers = [
  // Auth
  http.post('/api/v1/auth/login', () =>
    HttpResponse.json(MOCK_TOKEN_RESPONSE, { status: 200 }),
  ),
  http.post('/api/v1/auth/logout', () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json(MOCK_TOKEN_RESPONSE, { status: 200 }),
  ),
  http.get('/api/v1/auth/me', () =>
    HttpResponse.json(MOCK_DOCTOR_USER, { status: 200 }),
  ),
  http.post('/api/v1/auth/change-password', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Users
  http.get('/api/v1/users', () =>
    HttpResponse.json({ items: [MOCK_USER_RESPONSE], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.post('/api/v1/users', () =>
    HttpResponse.json(MOCK_USER_RESPONSE, { status: 201 }),
  ),
  http.get('/api/v1/users/:userId', () =>
    HttpResponse.json(MOCK_USER_RESPONSE, { status: 200 }),
  ),
  http.put('/api/v1/users/:userId', () =>
    HttpResponse.json(MOCK_USER_RESPONSE, { status: 200 }),
  ),
  http.post('/api/v1/users/:userId/reset-password', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Staff
  http.get('/api/v1/staff', () =>
    HttpResponse.json({ items: [{ id: MOCK_USER_ID, fullName: 'Dr Jane Smith', roles: ['DOCTOR'] }] }, { status: 200 }),
  ),

  // Patients
  http.get('/api/v1/patients', () =>
    HttpResponse.json({ items: [MOCK_PATIENT_SUMMARY], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.post('/api/v1/patients', () =>
    HttpResponse.json(MOCK_PATIENT, { status: 201 }),
  ),
  http.get('/api/v1/patients/by-number/:patientNumber', () =>
    HttpResponse.json(MOCK_PATIENT, { status: 200 }),
  ),
  http.get('/api/v1/patients/:patientId', () =>
    HttpResponse.json(MOCK_PATIENT, { status: 200 }),
  ),
  http.put('/api/v1/patients/:patientId', () =>
    HttpResponse.json(MOCK_PATIENT, { status: 200 }),
  ),
  http.get('/api/v1/patients/:patientId/medical-history', () =>
    HttpResponse.json(MOCK_MEDICAL_HISTORY, { status: 200 }),
  ),

  // Consultations
  http.post('/api/v1/consultations', () =>
    HttpResponse.json(MOCK_CONSULTATION, { status: 201 }),
  ),
  http.get('/api/v1/consultations/:consultationId', () =>
    HttpResponse.json(MOCK_CONSULTATION, { status: 200 }),
  ),
  http.post('/api/v1/consultations/:consultationId/prescriptions', () =>
    HttpResponse.json(MOCK_PRESCRIPTION, { status: 201 }),
  ),

  // Prescriptions
  http.get('/api/v1/prescriptions', () =>
    HttpResponse.json({ items: [MOCK_PRESCRIPTION_SUMMARY], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.get('/api/v1/prescriptions/:prescriptionId', () =>
    HttpResponse.json(MOCK_PRESCRIPTION, { status: 200 }),
  ),
  http.post('/api/v1/prescriptions/:prescriptionId/start', () =>
    HttpResponse.json({ ...MOCK_PRESCRIPTION, status: 'IN_PROGRESS' }, { status: 200 }),
  ),
  http.post('/api/v1/prescriptions/:prescriptionId/dispense', () =>
    HttpResponse.json({ ...MOCK_PRESCRIPTION, status: 'DISPENSED' }, { status: 200 }),
  ),
  http.post('/api/v1/prescriptions/:prescriptionId/cancel', () =>
    HttpResponse.json({ ...MOCK_PRESCRIPTION, status: 'CANCELLED' }, { status: 200 }),
  ),

  // Medicines
  http.get('/api/v1/medicines', () =>
    HttpResponse.json({ items: [MOCK_MEDICINE], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.post('/api/v1/medicines', () =>
    HttpResponse.json(MOCK_MEDICINE, { status: 201 }),
  ),
  http.get('/api/v1/medicines/:medicineId', () =>
    HttpResponse.json(MOCK_MEDICINE, { status: 200 }),
  ),
  http.put('/api/v1/medicines/:medicineId', () =>
    HttpResponse.json(MOCK_MEDICINE, { status: 200 }),
  ),

  // Queue sessions
  http.get('/api/v1/queue-sessions', () =>
    HttpResponse.json({ items: [MOCK_QUEUE_SESSION], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.post('/api/v1/queue-sessions', () =>
    HttpResponse.json(MOCK_QUEUE_SESSION, { status: 201 }),
  ),
  http.get('/api/v1/queue-sessions/:queueSessionId', () =>
    HttpResponse.json(MOCK_QUEUE_SESSION, { status: 200 }),
  ),
  http.post('/api/v1/queue-sessions/:queueSessionId/open', () =>
    HttpResponse.json({ ...MOCK_QUEUE_SESSION, status: 'OPEN' }, { status: 200 }),
  ),
  http.post('/api/v1/queue-sessions/:queueSessionId/close', () =>
    HttpResponse.json({ ...MOCK_QUEUE_SESSION, status: 'CLOSED' }, { status: 200 }),
  ),

  // Queue entries
  http.get('/api/v1/queue-sessions/:queueSessionId/entries', () =>
    HttpResponse.json({ items: [MOCK_QUEUE_ENTRY], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
  http.post('/api/v1/queue-sessions/:queueSessionId/entries', () =>
    HttpResponse.json(MOCK_QUEUE_ENTRY, { status: 201 }),
  ),
  http.post('/api/v1/queue-sessions/:queueSessionId/call-next', () =>
    HttpResponse.json({
      calledEntry: { ...MOCK_QUEUE_ENTRY, queueNumber: 4, status: 'SERVING' },
      completedEntry: null,
      session: MOCK_QUEUE_SESSION,
    }, { status: 200 }),
  ),
  http.post('/api/v1/queue-entries/:queueEntryId/call', () =>
    HttpResponse.json({ ...MOCK_QUEUE_ENTRY, status: 'SERVING' }, { status: 200 }),
  ),
  http.post('/api/v1/queue-entries/:queueEntryId/complete', () =>
    HttpResponse.json({ ...MOCK_QUEUE_ENTRY, status: 'COMPLETED' }, { status: 200 }),
  ),
  http.post('/api/v1/queue-entries/:queueEntryId/skip', () =>
    HttpResponse.json({ ...MOCK_QUEUE_ENTRY, status: 'SKIPPED' }, { status: 200 }),
  ),
  http.post('/api/v1/queue-entries/:queueEntryId/requeue', () =>
    HttpResponse.json({ ...MOCK_QUEUE_ENTRY, status: 'WAITING' }, { status: 200 }),
  ),
  http.post('/api/v1/queue-entries/:queueEntryId/cancel', () =>
    HttpResponse.json({ ...MOCK_QUEUE_ENTRY, status: 'CANCELLED' }, { status: 200 }),
  ),

  // Public queue
  http.get('/api/v1/public/queue-sessions', () =>
    HttpResponse.json({ date: '2026-10-13', items: [MOCK_PUBLIC_SESSION_SUMMARY] }, { status: 200 }),
  ),
  http.get('/api/v1/public/queue-sessions/:queueSessionId', () =>
    HttpResponse.json(MOCK_PUBLIC_QUEUE_STATUS, { status: 200 }),
  ),

  // Audit events
  http.get('/api/v1/audit-events', () =>
    HttpResponse.json({ items: [MOCK_AUDIT_EVENT], page: 0, size: 20, totalItems: 1, totalPages: 1 }, { status: 200 }),
  ),
];
