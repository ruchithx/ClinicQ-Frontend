import { z } from 'zod';

export const DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'SUSPENSION',
  'SOLUTION',
  'INJECTION',
  'CREAM',
  'OINTMENT',
  'GEL',
  'DROPS',
  'INHALER',
  'SUPPOSITORY',
  'POWDER',
  'PATCH',
  'OTHER',
] as const;

export const FREQUENCY_PRESETS = ['OD', 'BD', 'TDS', 'QDS', 'Nocte', 'Mane', 'PRN', 'STAT'];
export const QUANTITY_UNITS = ['tablets', 'capsules', 'ml', 'bottles', 'tubes', 'sachets', 'inhalers', 'drops'];

// ---- Field-level validators ----

export const patientNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,19}$/, 'Use 3-20 letters, digits or hyphens (starting with a letter or digit)');

export const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'Enter 7-15 digits, optionally starting with +'));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable();

const optionalPhone = phone.or(z.literal('')).optional();

// ---- Auth ----

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Required').max(50),
  password: z.string().min(1, 'Required').max(128),
});

export const passwordSchema = z.string().min(12, 'Minimum 12 characters').max(128);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ---- Patient ----

export const createPatientSchema = z
  .object({
    patientNumber,
    fullName: z.string().trim().min(1, 'Required').max(150),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
    dobMode: z.enum(['exact', 'estimated']),
    dateOfBirth: z.string().optional(),
    estimatedAgeYears: z.number().int().min(0).max(130).optional(),
    phoneNumber: optionalPhone,
    address: optionalText(300),
    knownAllergies: optionalText(1000),
  })
  .superRefine((data, ctx) => {
    if (data.dobMode === 'exact') {
      if (!data.dateOfBirth) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date of birth is required', path: ['dateOfBirth'] });
      } else {
        const dob = new Date(data.dateOfBirth);
        const minDate = new Date('1900-01-01');
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dob < minDate) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date must be after 1900-01-01', path: ['dateOfBirth'] });
        }
        if (dob > today) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date of birth cannot be in the future', path: ['dateOfBirth'] });
        }
      }
    } else {
      if (data.estimatedAgeYears === undefined || data.estimatedAgeYears === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Estimated age is required', path: ['estimatedAgeYears'] });
      }
    }
  });

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;

// ---- Prescription items ----

export const prescriptionItemSchema = z
  .object({
    source: z.enum(['catalogue', 'free']),
    medicineId: z.string().uuid().optional(),
    medicineName: z.string().trim().min(1).max(200).optional(),
    strength: optionalText(50),
    dosageForm: z.enum(DOSAGE_FORMS).nullable().optional(),
    dose: z.string().trim().min(1, 'Required').max(100),
    frequency: z.string().trim().min(1, 'Required').max(100),
    durationDays: z.number().int().min(1).max(365).nullable().optional(),
    quantity: z
      .string()
      .trim()
      // eslint-disable-next-line security/detect-unsafe-regex
      .regex(/^\d{1,5}(\.\d{1,2})?$/, 'Up to 5 digits and 2 decimals')
      .refine((v) => Number(v) > 0, 'Must be greater than 0'),
    quantityUnit: z.string().trim().min(1, 'Required').max(30),
    instructions: optionalText(500),
  })
  .superRefine((data, ctx) => {
    if (data.source === 'catalogue' && !data.medicineId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a medicine from the catalogue',
        path: ['medicineId'],
      });
    }
    if (data.source === 'free' && !data.medicineName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Medicine name is required',
        path: ['medicineName'],
      });
    }
  });

export const consultationSchema = z.object({
  presentingComplaint: optionalText(1000),
  clinicalNotes: optionalText(5000),
  diagnoses: z
    .array(
      z.object({
        conditionText: z.string().trim().min(1, 'Required').max(500),
        icd10Code: z
          .string()
          .trim()
          .toUpperCase()
          // eslint-disable-next-line security/detect-unsafe-regex
          .regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/, 'Enter a valid ICD-10 code')
          .or(z.literal(''))
          .optional(),
      }),
    )
    .min(1, 'At least one diagnosis is required')
    .max(10, 'Maximum 10 diagnoses'),
  hasPrescription: z.boolean(),
  prescription: z
    .object({
      notes: optionalText(1000),
      items: z.array(prescriptionItemSchema).min(1, 'At least one item required').max(30),
    })
    .nullable()
    .optional(),
});

export type ConsultationFormValues = z.infer<typeof consultationSchema>;

export const cancelReasonSchema = z.object({
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500),
});

export const bookingSchema = z.object({
  patientName: z.string().trim().min(1, 'Required').max(150),
  contactPhone: optionalPhone,
  channel: z.enum(['PHONE', 'WALK_IN']),
  notes: optionalText(300),
});

export const queueSessionSchema = z.object({
  sessionDate: z.string().min(1, 'Required'),
  name: z.string().trim().min(1, 'Required').max(100),
  assignedDoctorId: z.string().uuid().nullable().optional(),
});

export const dispenseSchema = z.object({
  items: z.array(
    z.object({
      prescriptionItemId: z.string().uuid(),
      dispensedQuantity: z
        .string()
        .trim()
        // eslint-disable-next-line security/detect-unsafe-regex
        .regex(/^\d{1,5}(\.\d{1,2})?$/, 'Invalid quantity')
        .refine((v) => Number(v) >= 0, 'Must be >= 0'),
      note: optionalText(500),
    }),
  ),
  notes: optionalText(1000),
  confirmed: z.literal(true, { error: 'Please confirm handover' }),
});

export const medicineSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(200),
  strength: optionalText(50),
  dosageForm: z.enum(DOSAGE_FORMS).nullable().optional(),
  active: z.boolean().optional(),
  version: z.number().optional(),
});

export const createUserSchema = z
  .object({
    username: z.string().trim().min(1, 'Required').max(50),
    fullName: z.string().trim().min(1, 'Required').max(150),
    roles: z.array(z.enum(['ADMIN', 'DOCTOR', 'PHARMACIST'])).min(1, 'Select at least one role'),
    registrationNumber: optionalText(50),
    temporaryPassword: passwordSchema,
    confirmTemporaryPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.temporaryPassword === d.confirmTemporaryPassword, {
    message: 'Passwords do not match',
    path: ['confirmTemporaryPassword'],
  });

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(150),
  roles: z.array(z.enum(['ADMIN', 'DOCTOR', 'PHARMACIST'])).min(1, 'Select at least one role'),
  enabled: z.boolean(),
  registrationNumber: optionalText(50),
  version: z.number(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
