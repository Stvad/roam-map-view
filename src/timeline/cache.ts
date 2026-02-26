import { haversineMeters, parseLatLng } from "../lib/geo";
import type { FrequentPlace, TimelineCache, TimelinePoint } from "../types";

export function buildTimelineCache(json: any): TimelineCache {
  const points: TimelinePoint[] = [];
  for (const entry of json?.rawSignals || []) {
    const pos = entry?.position;
    if (!pos?.timestamp || !pos?.LatLng) {
      continue;
    }
    const coord = parseLatLng(pos.LatLng);
    if (!coord) {
      continue;
    }
    const ts = new Date(pos.timestamp).getTime();
    if (!Number.isFinite(ts)) {
      continue;
    }
    points.push({
      ts,
      lat: coord.lat,
      lng: coord.lng,
      source: String(pos.source || "UNKNOWN"),
      accuracyMeters: Number.isFinite(pos.accuracyMeters) ? Number(pos.accuracyMeters) : undefined,
    });
  }
  points.sort((a, b) => a.ts - b.ts);

  const frequentPlaces: FrequentPlace[] = [];
  const rawPlaces = json?.userLocationProfile?.frequentPlaces || [];
  for (const p of rawPlaces) {
    const coord = parseLatLng(p?.placeLocation);
    if (!coord) {
      continue;
    }
    frequentPlaces.push({
      lat: coord.lat,
      lng: coord.lng,
      label: typeof p?.label === "string" ? p.label : undefined,
    });
  }

  return {
    version: 1,
    importedAt: Date.now(),
    points,
    frequentPlaces,
  };
}

export function nearestTimelinePoint(points: TimelinePoint[], ts: number): TimelinePoint | null {
  if (!points.length) {
    return null;
  }
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].ts < ts) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  let best: TimelinePoint | null = null;
  let bestDt = Number.POSITIVE_INFINITY;
  for (let i = Math.max(0, lo - 3); i <= Math.min(points.length - 1, lo + 3); i += 1) {
    const p = points[i];
    const dt = Math.abs(p.ts - ts);
    if (dt < bestDt) {
      best = p;
      bestDt = dt;
    }
  }
  return best;
}

export function nearestFrequentPlace(point: TimelinePoint, places: FrequentPlace[]): { label?: string; dist: number } | null {
  let best: { label?: string; dist: number } | null = null;
  for (const p of places) {
    const dist = haversineMeters({ lat: point.lat, lng: point.lng }, { lat: p.lat, lng: p.lng });
    if (!best || dist < best.dist) {
      best = { label: p.label, dist };
    }
  }
  return best;
}
