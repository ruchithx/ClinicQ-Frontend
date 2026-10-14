/**
 * Friendly type aliases for the generated schema.
 * Import from here, not from schema.d.ts directly.
 */
import type { components } from './schema';

export type TokenResponse = components['schemas']['TokenResponse'];
export type CurrentUser = components['schemas']['CurrentUser'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest'];

export type UserPage = components['schemas']['UserPage'];
export type UserResponse = components['schemas']['UserResponse'];
export type CreateUserRequest = components['schemas']['CreateUserRequest'];
export type UpdateUserRequest = components['schemas']['UpdateUserRequest'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
export type Role = components['schemas']['Role'];

export type StaffList = components['schemas']['StaffList'];
export type StaffMember = components['schemas']['StaffMember'];
export type StaffRef = components['schemas']['StaffRef'];

export type PatientSummaryPage = components['schemas']['PatientSummaryPage'];
export type PatientSummary = components['schemas']['PatientSummary'];
export type PatientResponse = components['schemas']['PatientResponse'];
export type PatientRef = components['schemas']['PatientRef'];
export type CreatePatientRequest = components['schemas']['CreatePatientRequest'];
export type UpdatePatientRequest = components['schemas']['UpdatePatientRequest'];
export type Sex = components['schemas']['Sex'];

export type MedicalHistoryResponse = components['schemas']['MedicalHistoryResponse'];
export type ConditionSummary = components['schemas']['ConditionSummary'];

export type ConsultationResponse = components['schemas']['ConsultationResponse'];
export type ConsultationPage = components['schemas']['ConsultationPage'];
export type Diagnosis = components['schemas']['Diagnosis'];
export type DiagnosisInput = components['schemas']['DiagnosisInput'];
export type CreateConsultationRequest = components['schemas']['CreateConsultationRequest'];
export type PrescriptionInput = components['schemas']['PrescriptionInput'];
export type AddPrescriptionRequest = components['schemas']['AddPrescriptionRequest'];

export type PrescriptionResponse = components['schemas']['PrescriptionResponse'];
export type PrescriptionSummaryPage = components['schemas']['PrescriptionSummaryPage'];
export type PrescriptionSummary = components['schemas']['PrescriptionSummary'];
export type PrescriptionStatus = components['schemas']['PrescriptionStatus'];
export type PrescriptionItem = components['schemas']['PrescriptionItem'];
export type PrescriptionItemInput = components['schemas']['PrescriptionItemInput'];
export type Dispensing = components['schemas']['Dispensing'];
export type DispensingItem = components['schemas']['DispensingItem'];
export type DispenseRequest = components['schemas']['DispenseRequest'];
export type DispenseItemInput = components['schemas']['DispenseItemInput'];
export type DispensingOutcome = components['schemas']['DispensingOutcome'];
export type DispensedItemStatus = components['schemas']['DispensedItemStatus'];
export type CancelPrescriptionRequest = components['schemas']['CancelPrescriptionRequest'];
export type DosageForm = components['schemas']['DosageForm'];

export type MedicinePage = components['schemas']['MedicinePage'];
export type MedicineResponse = components['schemas']['MedicineResponse'];
export type CreateMedicineRequest = components['schemas']['CreateMedicineRequest'];
export type UpdateMedicineRequest = components['schemas']['UpdateMedicineRequest'];

export type QueueSessionPage = components['schemas']['QueueSessionPage'];
export type QueueSessionResponse = components['schemas']['QueueSessionResponse'];
export type QueueSessionStatus = components['schemas']['QueueSessionStatus'];
export type QueueCounts = components['schemas']['QueueCounts'];
export type ServingEntry = components['schemas']['ServingEntry'];
export type CreateQueueSessionRequest = components['schemas']['CreateQueueSessionRequest'];
export type CloseQueueSessionRequest = components['schemas']['CloseQueueSessionRequest'];

export type QueueEntryPage = components['schemas']['QueueEntryPage'];
export type QueueEntryResponse = components['schemas']['QueueEntryResponse'];
export type QueueEntryStatus = components['schemas']['QueueEntryStatus'];
export type QueueEntryRef = components['schemas']['QueueEntryRef'];
export type BookingChannel = components['schemas']['BookingChannel'];
export type CreateBookingRequest = components['schemas']['CreateBookingRequest'];
export type CallNextRequest = components['schemas']['CallNextRequest'];
export type CallNextResponse = components['schemas']['CallNextResponse'];
export type SkipQueueEntryRequest = components['schemas']['SkipQueueEntryRequest'];
export type CancelBookingRequest = components['schemas']['CancelBookingRequest'];

export type PublicQueueSessionList = components['schemas']['PublicQueueSessionList'];
export type PublicQueueSessionSummary = components['schemas']['PublicQueueSessionSummary'];
export type PublicQueueStatus = components['schemas']['PublicQueueStatus'];

export type AuditEventPage = components['schemas']['AuditEventPage'];
export type AuditEventResponse = components['schemas']['AuditEventResponse'];
export type AuditAction = components['schemas']['AuditAction'];
export type AuditOutcome = components['schemas']['AuditOutcome'];

export type Problem = components['schemas']['Problem'];
export type FieldError = components['schemas']['FieldError'];
export type ErrorCode = components['schemas']['ErrorCode'];
