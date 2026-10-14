/** Format an ISO date string to "12 Oct 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format an ISO datetime string to "12 Oct 2026, 10:15" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Format time only: "10:42:05" */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Relative time ("14 min ago", "just now") */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs} h ago`;
}

/** Compute age from ISO date, prefix ~ if estimated */
export function formatAge(
  dateOfBirth: string | null | undefined,
  estimated: boolean,
): string {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years--;
  return estimated ? `~${years} y (estimated)` : `${years} y`;
}

/** Format prescription number to "RX-000123" (already formatted from backend) */
export function formatRxNumber(num: string | null | undefined): string {
  return num ?? '—';
}

/** Format a quantity number removing trailing zeros */
export function formatQuantity(qty: number | null | undefined, unit?: string): string {
  if (qty === null || qty === undefined) return '—';
  const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');
  return unit ? `${formatted} ${unit}` : formatted;
}
