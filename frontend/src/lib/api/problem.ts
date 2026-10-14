import { type ErrorCode, errorMessages } from './error-messages';
import type { UseFormReturn } from 'react-hook-form';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly title: string,
    public readonly detail: string,
    public readonly errors: FieldError[],
    public readonly requestId: string | null,
    // Extra fields from the problem response (e.g. existingPatientId, lockedUntil)
    public readonly extra: Record<string, unknown>,
  ) {
    super(detail || title);
    this.name = 'ApiError';
  }
}

export function parseApiError(status: number, body: unknown): ApiError {
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    const code = (b['code'] as ErrorCode) ?? 'INTERNAL_ERROR';
    const title = (b['title'] as string) ?? 'Error';
    const detail = (b['detail'] as string) ?? '';
    const errors = Array.isArray(b['errors'])
      ? (b['errors'] as FieldError[]).map((e) => ({
          field: String(e.field ?? ''),
          message: String(e.message ?? ''),
        }))
      : [];
    const requestId = (b['requestId'] as string) ?? null;
    const { code: _c, title: _t, detail: _d, errors: _e, requestId: _r, ...extra } = b;
    void _c;
    void _t;
    void _d;
    void _e;
    void _r;
    return new ApiError(status, code, title, detail, errors, requestId, extra);
  }
  return new ApiError(status, 'INTERNAL_ERROR', 'Error', 'Unexpected error', [], null, {});
}

/** Map an ApiError to a user-readable message */
export function toUserMessage(
  err: unknown,
  screenOverrides?: Partial<Record<ErrorCode, string>>,
): string {
  if (!(err instanceof ApiError)) {
    return errorMessages['INTERNAL_ERROR'];
  }
  if (screenOverrides?.[err.code]) {
    return screenOverrides[err.code]!;
  }
  return errorMessages[err.code] ?? err.detail ?? errorMessages['INTERNAL_ERROR'];
}

/** Convert a JSON pointer field path like "prescription.items[2].quantity"
 *  to React Hook Form path "prescription.items.2.quantity" */
function toRhfPath(field: string): string {
  return field.replace(/\[(\d+)]/g, '.$1');
}

/** Apply field errors from an ApiError to a React Hook Form instance */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFieldErrors(form: UseFormReturn<any>, err: ApiError): string[] {
  const unmatched: string[] = [];
  for (const fe of err.errors) {
    if (fe.field) {
      form.setError(toRhfPath(fe.field) as never, { message: fe.message });
    } else {
      unmatched.push(fe.message);
    }
  }
  return unmatched;
}
