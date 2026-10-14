import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatAge,
  formatRxNumber,
  formatQuantity,
} from '@/lib/format';

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });
  it('formats a valid ISO date', () => {
    const result = formatDate('2026-10-13T00:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('Oct');
    expect(result).toContain('13');
  });
});

describe('formatDateTime', () => {
  it('returns em dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
  it('formats a valid ISO datetime', () => {
    const result = formatDateTime('2026-10-13T09:30:00Z');
    expect(result).toContain('2026');
  });
});

describe('formatTime', () => {
  it('returns em dash for null', () => {
    expect(formatTime(null)).toBe('—');
  });
  it('formats a time string', () => {
    const result = formatTime('2026-10-13T09:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns em dash for null', () => {
    expect(formatRelativeTime(null)).toBe('—');
  });
  it('returns just now for recent times', () => {
    expect(formatRelativeTime('2026-10-13T09:59:50Z')).toBe('just now');
  });
  it('returns minutes ago', () => {
    expect(formatRelativeTime('2026-10-13T09:45:00Z')).toBe('15 min ago');
  });
  it('returns hours ago', () => {
    expect(formatRelativeTime('2026-10-13T07:00:00Z')).toBe('3 h ago');
  });
});

describe('formatAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns em dash for null', () => {
    expect(formatAge(null, false)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatAge(undefined, false)).toBe('—');
  });
  it('calculates age correctly', () => {
    expect(formatAge('1985-03-15', false)).toBe('41 y');
  });
  it('shows estimated prefix', () => {
    expect(formatAge('1985-03-15', true)).toBe('~41 y (estimated)');
  });
});

describe('formatRxNumber', () => {
  it('returns em dash for null', () => {
    expect(formatRxNumber(null)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatRxNumber(undefined)).toBe('—');
  });
  it('passes through a value', () => {
    expect(formatRxNumber('RX-000001')).toBe('RX-000001');
  });
});

describe('formatQuantity', () => {
  it('returns em dash for null', () => {
    expect(formatQuantity(null)).toBe('—');
  });
  it('returns em dash for undefined', () => {
    expect(formatQuantity(undefined)).toBe('—');
  });
  it('formats an integer', () => {
    expect(formatQuantity(15)).toBe('15');
  });
  it('removes trailing zeros', () => {
    expect(formatQuantity(1.50)).toBe('1.5');
  });
  it('appends unit when given', () => {
    expect(formatQuantity(15, 'tablets')).toBe('15 tablets');
  });
});
