export function parseMatrixTimestamp(raw: string): number | null {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) {
    return null;
  }
  const [_, dd, mm, yyyy, hh, min, ss] = m;
  const local = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
  const t = new Date(local).getTime();
  return Number.isFinite(t) ? t : null;
}

export function formatTs(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function nowMinusHours(hours: number): Date {
  return new Date(Date.now() - hours * 3600 * 1000);
}

export function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
