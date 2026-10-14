import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createPatientSchema,
  consultationSchema,
  dispenseSchema,
  changePasswordSchema,
} from '@/lib/validation/schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'secret' });
    expect(result.success).toBe(true);
  });
  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret' });
    expect(result.success).toBe(false);
  });
  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts matching passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });
    expect(result.success).toBe(true);
  });
  it('rejects mismatched passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'NewPassword123!',
      confirmPassword: 'DifferentPass123!',
    });
    expect(result.success).toBe(false);
  });
  it('rejects short new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('createPatientSchema', () => {
  const baseExact = {
    patientNumber: 'P-001',
    fullName: 'John Doe',
    sex: 'MALE' as const,
    dobMode: 'exact' as const,
    dateOfBirth: '1985-03-15',
    estimatedAgeYears: undefined,
    phoneNumber: undefined,
    address: null,
    knownAllergies: null,
  };

  it('accepts exact DOB', () => {
    const result = createPatientSchema.safeParse(baseExact);
    expect(result.success).toBe(true);
  });

  it('accepts estimated age', () => {
    const result = createPatientSchema.safeParse({
      ...baseExact,
      dobMode: 'estimated',
      dateOfBirth: undefined,
      estimatedAgeYears: 41,
    });
    expect(result.success).toBe(true);
  });

  it('rejects exact mode with missing DOB', () => {
    const result = createPatientSchema.safeParse({
      ...baseExact,
      dateOfBirth: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects estimated mode with missing age', () => {
    const result = createPatientSchema.safeParse({
      ...baseExact,
      dobMode: 'estimated',
      dateOfBirth: undefined,
      estimatedAgeYears: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects future DOB', () => {
    const result = createPatientSchema.safeParse({
      ...baseExact,
      dateOfBirth: '2099-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid patient number', () => {
    const result = createPatientSchema.safeParse({
      ...baseExact,
      patientNumber: 'x', // too short
    });
    expect(result.success).toBe(false);
  });
});

describe('consultationSchema', () => {
  const baseConsultation = {
    presentingComplaint: null,
    clinicalNotes: null,
    diagnoses: [{ conditionText: 'Fever', icd10Code: '' }],
    hasPrescription: false,
    prescription: null,
  };

  it('accepts a valid consultation', () => {
    const result = consultationSchema.safeParse(baseConsultation);
    expect(result.success).toBe(true);
  });

  it('rejects empty diagnoses array', () => {
    const result = consultationSchema.safeParse({ ...baseConsultation, diagnoses: [] });
    expect(result.success).toBe(false);
  });

  it('rejects diagnosis with empty conditionText', () => {
    const result = consultationSchema.safeParse({
      ...baseConsultation,
      diagnoses: [{ conditionText: '', icd10Code: '' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('dispenseSchema', () => {
  const baseDispense = {
    notes: '',
    confirmed: true as const,
    items: [{
      prescriptionItemId: 'd4000000-0000-4000-8000-000000000031',
      dispensedQuantity: '15',
      note: '',
    }],
  };

  it('accepts valid dispense data', () => {
    const result = dispenseSchema.safeParse(baseDispense);
    expect(result.success).toBe(true);
  });

  it('rejects when confirmed is not true', () => {
    const result = dispenseSchema.safeParse({ ...baseDispense, confirmed: false });
    expect(result.success).toBe(false);
  });

  it('rejects invalid quantity', () => {
    const result = dispenseSchema.safeParse({
      ...baseDispense,
      items: [{ prescriptionItemId: 'd4000000-0000-4000-8000-000000000031', dispensedQuantity: 'abc', note: '' }],
    });
    expect(result.success).toBe(false);
  });
});
