/**
 * One typed function per operationId (section 5.3 of frontend-requirements.md).
 * All types come from the generated schema via types.ts.
 */
import { apiGet, apiPost, apiPut, buildPath } from './client';
import type {
  TokenResponse,
  CurrentUser,
  LoginRequest,
  ChangePasswordRequest,
  UserPage,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  StaffList,
  PatientSummaryPage,
  PatientResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
  MedicalHistoryResponse,
  ConsultationResponse,
  CreateConsultationRequest,
  AddPrescriptionRequest,
  PrescriptionResponse,
  PrescriptionSummaryPage,
  DispenseRequest,
  CancelPrescriptionRequest,
  MedicinePage,
  MedicineResponse,
  CreateMedicineRequest,
  UpdateMedicineRequest,
  QueueSessionPage,
  QueueSessionResponse,
  CreateQueueSessionRequest,
  CloseQueueSessionRequest,
  QueueEntryPage,
  QueueEntryResponse,
  CreateBookingRequest,
  CallNextRequest,
  CallNextResponse,
  SkipQueueEntryRequest,
  CancelBookingRequest,
  PublicQueueSessionList,
  PublicQueueStatus,
  AuditEventPage,
} from './types';

export * from './types';

// ---------- Authentication ----------

export async function login(req: LoginRequest): Promise<TokenResponse> {
  const r = await apiPost<TokenResponse>('/auth/login', { body: req });
  return r.data;
}

export async function refreshToken(): Promise<TokenResponse> {
  const r = await apiPost<TokenResponse>('/auth/refresh', { credentials: 'same-origin' });
  return r.data;
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout');
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const r = await apiGet<CurrentUser>('/auth/me');
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function changePassword(req: ChangePasswordRequest): Promise<void> {
  await apiPost('/auth/change-password', { body: req });
}

// ---------- Users ----------

export async function listUsers(params?: {
  search?: string;
  role?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}): Promise<UserPage> {
  const r = await apiGet<UserPage>('/users', {
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function createUser(req: CreateUserRequest): Promise<UserResponse> {
  const r = await apiPost<UserResponse>('/users', { body: req });
  return r.data;
}

export async function getUser(userId: string): Promise<UserResponse> {
  const r = await apiGet<UserResponse>(buildPath('/users/{userId}', { userId }));
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function updateUser(userId: string, req: UpdateUserRequest): Promise<UserResponse> {
  const r = await apiPut<UserResponse>(buildPath('/users/{userId}', { userId }), { body: req });
  return r.data;
}

export async function resetUserPassword(
  userId: string,
  req: ResetPasswordRequest,
): Promise<void> {
  await apiPost(buildPath('/users/{userId}/reset-password', { userId }), { body: req });
}

// ---------- Staff directory ----------

export async function listStaff(role?: string): Promise<StaffList> {
  const r = await apiGet<StaffList>('/staff', { query: role ? { role } : undefined });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

// ---------- Patients ----------

export async function searchPatients(params?: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<PatientSummaryPage> {
  const r = await apiGet<PatientSummaryPage>('/patients', {
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function createPatient(
  req: CreatePatientRequest,
  idempotencyKey: string,
): Promise<PatientResponse> {
  const r = await apiPost<PatientResponse>('/patients', { body: req, idempotencyKey });
  return r.data;
}

export async function getPatientByNumber(patientNumber: string): Promise<PatientResponse> {
  const r = await apiGet<PatientResponse>(
    buildPath('/patients/by-number/{patientNumber}', { patientNumber }),
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function getPatient(patientId: string): Promise<PatientResponse> {
  const r = await apiGet<PatientResponse>(buildPath('/patients/{patientId}', { patientId }));
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function updatePatient(
  patientId: string,
  req: UpdatePatientRequest,
): Promise<PatientResponse> {
  const r = await apiPut<PatientResponse>(buildPath('/patients/{patientId}', { patientId }), {
    body: req,
  });
  return r.data;
}

export async function getMedicalHistory(
  patientId: string,
  params?: { page?: number; size?: number },
): Promise<MedicalHistoryResponse> {
  const r = await apiGet<MedicalHistoryResponse>(
    buildPath('/patients/{patientId}/medical-history', { patientId }),
    { query: params as Record<string, string | number | boolean | null | undefined> },
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

// ---------- Consultations ----------

export async function createConsultation(
  req: CreateConsultationRequest,
  idempotencyKey: string,
): Promise<ConsultationResponse> {
  const r = await apiPost<ConsultationResponse>('/consultations', { body: req, idempotencyKey });
  return r.data;
}

export interface ETagResult<T> {
  data: T;
  etag?: string;
  notModified?: never;
}

export async function getConsultation(
  consultationId: string,
  ifNoneMatch?: string,
): Promise<ETagResult<ConsultationResponse> | { notModified: true }> {
  const result = await apiGet<ConsultationResponse>(
    buildPath('/consultations/{consultationId}', { consultationId }),
    { ifNoneMatch },
  );
  if ('notModified' in result) return { notModified: true };
  return { data: result.data, etag: result.etag };
}

export async function addPrescriptionToConsultation(
  consultationId: string,
  req: AddPrescriptionRequest,
  idempotencyKey: string,
): Promise<PrescriptionResponse> {
  const r = await apiPost<PrescriptionResponse>(
    buildPath('/consultations/{consultationId}/prescriptions', { consultationId }),
    { body: req, idempotencyKey },
  );
  return r.data;
}

// ---------- Prescriptions ----------

export async function listPrescriptions(params?: {
  patientId?: string;
  doctorId?: string;
  status?: string | string[];
  submittedFrom?: string;
  submittedTo?: string;
  search?: string;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<PrescriptionSummaryPage> {
  const r = await apiGet<PrescriptionSummaryPage>('/prescriptions', {
    query: params as Record<string, string | number | boolean | string[] | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function getPrescription(prescriptionId: string): Promise<PrescriptionResponse> {
  const r = await apiGet<PrescriptionResponse>(
    buildPath('/prescriptions/{prescriptionId}', { prescriptionId }),
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function startPrescription(prescriptionId: string): Promise<PrescriptionResponse> {
  const r = await apiPost<PrescriptionResponse>(
    buildPath('/prescriptions/{prescriptionId}/start', { prescriptionId }),
  );
  return r.data;
}

export async function dispensePrescription(
  prescriptionId: string,
  req: DispenseRequest,
  idempotencyKey: string,
): Promise<PrescriptionResponse> {
  const r = await apiPost<PrescriptionResponse>(
    buildPath('/prescriptions/{prescriptionId}/dispense', { prescriptionId }),
    { body: req, idempotencyKey },
  );
  return r.data;
}

export async function cancelPrescription(
  prescriptionId: string,
  req: CancelPrescriptionRequest,
): Promise<PrescriptionResponse> {
  const r = await apiPost<PrescriptionResponse>(
    buildPath('/prescriptions/{prescriptionId}/cancel', { prescriptionId }),
    { body: req },
  );
  return r.data;
}

// ---------- Medicines ----------

export async function listMedicines(params?: {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<MedicinePage> {
  const r = await apiGet<MedicinePage>('/medicines', {
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function createMedicine(req: CreateMedicineRequest): Promise<MedicineResponse> {
  const r = await apiPost<MedicineResponse>('/medicines', { body: req });
  return r.data;
}

export async function getMedicine(medicineId: string): Promise<MedicineResponse> {
  const r = await apiGet<MedicineResponse>(
    buildPath('/medicines/{medicineId}', { medicineId }),
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function updateMedicine(
  medicineId: string,
  req: UpdateMedicineRequest,
): Promise<MedicineResponse> {
  const r = await apiPut<MedicineResponse>(
    buildPath('/medicines/{medicineId}', { medicineId }),
    { body: req },
  );
  return r.data;
}

// ---------- Queue sessions ----------

export async function listQueueSessions(params?: {
  date?: string;
  status?: string | string[];
  page?: number;
  size?: number;
}): Promise<QueueSessionPage> {
  const r = await apiGet<QueueSessionPage>('/queue-sessions', {
    query: params as Record<string, string | number | boolean | string[] | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function createQueueSession(
  req: CreateQueueSessionRequest,
): Promise<QueueSessionResponse> {
  const r = await apiPost<QueueSessionResponse>('/queue-sessions', { body: req });
  return r.data;
}

export async function getQueueSession(
  queueSessionId: string,
  ifNoneMatch?: string,
): Promise<ETagResult<QueueSessionResponse> | { notModified: true }> {
  const result = await apiGet<QueueSessionResponse>(
    buildPath('/queue-sessions/{queueSessionId}', { queueSessionId }),
    { ifNoneMatch },
  );
  if ('notModified' in result) return { notModified: true };
  return { data: result.data, etag: result.etag };
}

export async function openQueueSession(
  queueSessionId: string,
): Promise<QueueSessionResponse> {
  const r = await apiPost<QueueSessionResponse>(
    buildPath('/queue-sessions/{queueSessionId}/open', { queueSessionId }),
  );
  return r.data;
}

export async function closeQueueSession(
  queueSessionId: string,
  req: CloseQueueSessionRequest,
): Promise<QueueSessionResponse> {
  const r = await apiPost<QueueSessionResponse>(
    buildPath('/queue-sessions/{queueSessionId}/close', { queueSessionId }),
    { body: req },
  );
  return r.data;
}

// ---------- Queue entries ----------

export async function listQueueEntries(
  queueSessionId: string,
  params?: {
    status?: string | string[];
    page?: number;
    size?: number;
  },
): Promise<QueueEntryPage> {
  const r = await apiGet<QueueEntryPage>(
    buildPath('/queue-sessions/{queueSessionId}/entries', { queueSessionId }),
    { query: params as Record<string, string | number | boolean | string[] | null | undefined> },
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function createBooking(
  queueSessionId: string,
  req: CreateBookingRequest,
  idempotencyKey: string,
): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-sessions/{queueSessionId}/entries', { queueSessionId }),
    { body: req, idempotencyKey },
  );
  return r.data;
}

export async function callNextPatient(
  queueSessionId: string,
  req: CallNextRequest,
): Promise<CallNextResponse> {
  const r = await apiPost<CallNextResponse>(
    buildPath('/queue-sessions/{queueSessionId}/call-next', { queueSessionId }),
    { body: req },
  );
  return r.data;
}

export async function getQueueEntry(queueEntryId: string): Promise<QueueEntryResponse> {
  const r = await apiGet<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}', { queueEntryId }),
  );
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function callQueueEntry(queueEntryId: string): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}/call', { queueEntryId }),
  );
  return r.data;
}

export async function completeQueueEntry(queueEntryId: string): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}/complete', { queueEntryId }),
  );
  return r.data;
}

export async function skipQueueEntry(
  queueEntryId: string,
  req: SkipQueueEntryRequest,
): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}/skip', { queueEntryId }),
    { body: req },
  );
  return r.data;
}

export async function requeueQueueEntry(queueEntryId: string): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}/requeue', { queueEntryId }),
  );
  return r.data;
}

export async function cancelBooking(
  queueEntryId: string,
  req: CancelBookingRequest,
): Promise<QueueEntryResponse> {
  const r = await apiPost<QueueEntryResponse>(
    buildPath('/queue-entries/{queueEntryId}/cancel', { queueEntryId }),
    { body: req },
  );
  return r.data;
}

// ---------- Public queue ----------

export async function listPublicQueueSessions(): Promise<PublicQueueSessionList> {
  const r = await apiGet<PublicQueueSessionList>('/public/queue-sessions');
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}

export async function getPublicQueueStatus(
  queueSessionId: string,
  ifNoneMatch?: string,
): Promise<ETagResult<PublicQueueStatus> | { notModified: true }> {
  const result = await apiGet<PublicQueueStatus>(
    buildPath('/public/queue-sessions/{queueSessionId}', { queueSessionId }),
    { ifNoneMatch },
  );
  if ('notModified' in result) return { notModified: true };
  return { data: result.data, etag: result.etag };
}

// ---------- Audit ----------

export async function listAuditEvents(params?: {
  patientId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<AuditEventPage> {
  const r = await apiGet<AuditEventPage>('/audit-events', {
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
  if ('notModified' in r) throw new Error('Unexpected 304');
  return r.data;
}
