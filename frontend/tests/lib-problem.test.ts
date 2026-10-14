import { describe, it, expect, vi } from 'vitest';
import { ApiError, parseApiError, toUserMessage, applyFieldErrors } from '@/lib/api/problem';

describe('parseApiError', () => {
  it('parses a well-formed problem body', () => {
    const body = {
      code: 'INVALID_CREDENTIALS',
      title: 'Invalid credentials',
      detail: 'Username or password incorrect',
      errors: [],
      requestId: 'req-001',
    };
    const err = parseApiError(401, body);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(err.title).toBe('Invalid credentials');
    expect(err.requestId).toBe('req-001');
  });

  it('handles a null body gracefully', () => {
    const err = parseApiError(500, null);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('handles a string body gracefully', () => {
    const err = parseApiError(500, 'Internal Server Error');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('parses field errors', () => {
    const body = {
      code: 'VALIDATION_FAILED',
      title: 'Validation failed',
      detail: '',
      errors: [{ field: 'fullName', message: 'Required' }],
      requestId: null,
    };
    const err = parseApiError(422, body);
    expect(err.errors).toHaveLength(1);
    expect(err.errors[0]!.field).toBe('fullName');
    expect(err.errors[0]!.message).toBe('Required');
  });

  it('stores extra fields', () => {
    const body = {
      code: 'ACCOUNT_LOCKED',
      title: 'Account locked',
      detail: '',
      errors: [],
      requestId: null,
      lockedUntil: '2026-10-13T10:00:00Z',
    };
    const err = parseApiError(401, body);
    expect(err.extra['lockedUntil']).toBe('2026-10-13T10:00:00Z');
  });
});

describe('toUserMessage', () => {
  it('returns a fallback for non-ApiError', () => {
    const msg = toUserMessage(new Error('boom'));
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
  });

  it('returns override when provided', () => {
    const err = parseApiError(422, { code: 'VALIDATION_FAILED', title: 'Val', detail: '', errors: [], requestId: null });
    const msg = toUserMessage(err, { VALIDATION_FAILED: 'Custom message' });
    expect(msg).toBe('Custom message');
  });

  it('returns detail for unknown codes', () => {
    const err = new ApiError(500, 'UNKNOWN_CODE' as never, 'title', 'some detail', [], null, {});
    const msg = toUserMessage(err);
    expect(msg).toBeTruthy();
  });
});

describe('applyFieldErrors', () => {
  it('sets field errors on the form', () => {
    const setError = vi.fn();
    const form = { setError } as never;
    const err = new ApiError(422, 'VALIDATION_FAILED', 'Val', '', [
      { field: 'username', message: 'Too short' },
    ], null, {});
    applyFieldErrors(form, err);
    expect(setError).toHaveBeenCalledWith('username', { message: 'Too short' });
  });

  it('converts JSON pointer array indices to RHF path', () => {
    const setError = vi.fn();
    const form = { setError } as never;
    const err = new ApiError(422, 'VALIDATION_FAILED', 'Val', '', [
      { field: 'items[0].quantity', message: 'Required' },
    ], null, {});
    applyFieldErrors(form, err);
    expect(setError).toHaveBeenCalledWith('items.0.quantity', { message: 'Required' });
  });

  it('returns unmatched messages for empty field', () => {
    const setError = vi.fn();
    const form = { setError } as never;
    const err = new ApiError(422, 'VALIDATION_FAILED', 'Val', '', [
      { field: '', message: 'General error' },
    ], null, {});
    const unmatched = applyFieldErrors(form, err);
    expect(unmatched).toContain('General error');
    expect(setError).not.toHaveBeenCalled();
  });
});
