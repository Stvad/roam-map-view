export function parseLatLng(raw: string | undefined): { lat: number; lng: number } | null {
  if (!raw) {
    return null;
  }
  const m = raw.match(/(-?\d+(?:\.\d+)?)°\s*,\s*(-?\d+(?:\.\d+)?)°/);
  if (!m) {
    return null;
  }
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);
  const aa = sa * sa + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sb * sb;
  return 2 * r * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}
