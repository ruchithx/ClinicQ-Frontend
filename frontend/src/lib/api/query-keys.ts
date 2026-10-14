export const queryKeys = {
  me: () => ['me'] as const,

  users: {
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (userId: string) => ['users', userId] as const,
  },

  staff: (role?: string) => ['staff', role] as const,

  patients: {
    search: (params?: Record<string, unknown>) => ['patients', 'search', params] as const,
    byNumber: (patientNumber: string) => ['patients', 'by-number', patientNumber] as const,
    detail: (patientId: string) => ['patients', patientId] as const,
    history: (patientId: string, params?: Record<string, unknown>) =>
      ['patients', patientId, 'history', params] as const,
  },

  consultations: {
    detail: (consultationId: string) => ['consultations', consultationId] as const,
  },

  prescriptions: {
    list: (filters?: Record<string, unknown>) => ['prescriptions', 'list', filters] as const,
    detail: (prescriptionId: string) => ['prescriptions', prescriptionId] as const,
  },

  medicines: {
    list: (filters?: Record<string, unknown>) => ['medicines', 'list', filters] as const,
    detail: (medicineId: string) => ['medicines', medicineId] as const,
  },

  queueSessions: {
    list: (params?: Record<string, unknown>) => ['queue-sessions', 'list', params] as const,
    detail: (queueSessionId: string) => ['queue-sessions', queueSessionId] as const,
    entries: (queueSessionId: string, filters?: Record<string, unknown>) =>
      ['queue-sessions', queueSessionId, 'entries', filters] as const,
  },

  queueEntries: {
    detail: (queueEntryId: string) => ['queue-entries', queueEntryId] as const,
  },

  public: {
    queueSessions: () => ['public', 'queue-sessions'] as const,
    queueStatus: (queueSessionId: string) =>
      ['public', 'queue-sessions', queueSessionId] as const,
  },

  auditEvents: (filters?: Record<string, unknown>) => ['audit-events', filters] as const,
};
