import { findMatrixTimestampInTree } from "../lib/matrix";
import { firstMeaningfulText, isDailyPageTitle, isDailyPageUid, isMeaningful } from "../lib/text";
import { nearestFrequentPlace, nearestTimelinePoint } from "../timeline/cache";
import type { NoteLocation, TimelineCache, TopBlockInfo } from "../types";

function changedBlocksQuery(attr: ":edit/time" | ":block/edit-time"): string {
  return `[:find ?uid ?et
      :in $ ?start ?end
      :where
      [?b :block/uid ?uid]
      [?b ${attr} ?et]
      [(>= ?et ?start)]
      [(<= ?et ?end)]]`;
}

function changedBlocksAllQuery(attr: ":edit/time" | ":block/edit-time"): string {
  return `[:find ?uid ?et
      :where
      [?b :block/uid ?uid]
      [?b ${attr} ?et]]`;
}

function pageTitleForUid(uid: string): string | undefined {
  try {
    const entity = window.roamAlphaAPI.pull("[:node/title]", [":block/uid", uid]) as { [k: string]: unknown } | null;
    const title = entity?.[":node/title"];
    return typeof title === "string" ? title : undefined;
  } catch {
    return undefined;
  }
}

function immediateParent(uid: string): { uid: string; pageTitle?: string } | null {
  const result = window.roamAlphaAPI.q(
    `[:find ?puid
      :in $ ?uid
      :where
      [?c :block/uid ?uid]
      [?p :block/children ?c]
      [?p :block/uid ?puid]]`,
    uid
  ) as [string][];

  if (!result?.length) {
    return null;
  }
  const puid = result[0][0];
  return { uid: puid, pageTitle: pageTitleForUid(puid) };
}

function topLevelForBlock(
  uid: string,
  changedUids: Set<string>,
  cache: Map<string, TopBlockInfo>
): TopBlockInfo | null {
  if (cache.has(uid)) {
    return cache.get(uid) || null;
  }

  const selfPageTitle = pageTitleForUid(uid);
  if (selfPageTitle) {
    const info = { topUid: uid, pageTitle: selfPageTitle, pageUid: uid };
    cache.set(uid, info);
    return info;
  }

  let current = uid;
  let highestChanged = changedUids.has(uid) ? uid : null;
  let depth = 0;
  while (depth < 200) {
    const parent = immediateParent(current);
    if (!parent) {
      return null;
    }
    if (parent.pageTitle) {
      const info = { topUid: highestChanged || current, pageTitle: parent.pageTitle, pageUid: parent.uid };
      cache.set(uid, info);
      return info;
    }
    if (changedUids.has(parent.uid)) {
      highestChanged = parent.uid;
    }
    current = parent.uid;
    depth += 1;
  }
  return null;
}

function normalizeEditTime(rawEditTime: number): number {
  // Roam edit-time can appear in seconds, milliseconds, or microseconds depending on API path.
  if (rawEditTime > 1e14) {
    return Math.floor(rawEditTime / 1000);
  }
  if (rawEditTime < 1e11) {
    return rawEditTime * 1000;
  }
  return rawEditTime;
}

function toEpochMs(raw: unknown): number | null {
  if (raw == null) {
    return null;
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  if (typeof raw === "number") {
    return normalizeEditTime(raw);
  }
  if (typeof raw === "bigint") {
    return normalizeEditTime(Number(raw));
  }
  if (typeof raw === "string") {
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) {
      return normalizeEditTime(asNum);
    }
    const asDate = new Date(raw).getTime();
    return Number.isFinite(asDate) ? asDate : null;
  }
  return null;
}

function normalizeRows(rows: Array<[string, unknown]>): [string, number][] {
  const out: [string, number][] = [];
  for (const [uid, rawEt] of rows) {
    const et = toEpochMs(rawEt);
    if (!uid || !Number.isFinite(et)) {
      continue;
    }
    out.push([uid, et as number]);
  }
  return out;
}

function queryChangedBlocks(startMs: number, endMs: number): [string, number][] {
  const attrs: Array<":edit/time" | ":block/edit-time"> = [":edit/time", ":block/edit-time"];
  const ranges: Array<{ kind: "ms" | "micro" | "sec" | "date"; start: number | Date; end: number | Date }> = [
    { kind: "ms", start: startMs, end: endMs },
    { kind: "micro", start: startMs * 1000, end: endMs * 1000 },
    { kind: "sec", start: Math.floor(startMs / 1000), end: Math.floor(endMs / 1000) },
    { kind: "date", start: new Date(startMs), end: new Date(endMs) },
  ];

  for (const attr of attrs) {
    for (const r of ranges) {
      try {
        const rawRows = (window.roamAlphaAPI.q(changedBlocksQuery(attr), r.start, r.end) || []) as Array<[string, unknown]>;
        const rows = normalizeRows(rawRows);
        if (rows.length) {
          return rows;
        }
      } catch (e) {
        void e;
      }
    }
  }

  // Fallback for graphs where range comparisons don't match stored type: scan all and filter client-side.
  for (const attr of attrs) {
    try {
      const rawRows = (window.roamAlphaAPI.q(changedBlocksAllQuery(attr)) || []) as Array<[string, unknown]>;
      const filtered = normalizeRows(rawRows).filter(([, et]) => et >= startMs && et <= endMs);
      if (filtered.length) {
        return filtered;
      }
    } catch (e) {
      void e;
    }
  }

  return [];
}

function pullBlockTree(uid: string): any | null {
  try {
    return window.roamAlphaAPI.pull(
      "[:block/uid :block/string :edit/time {:block/children ...}]",
      [":block/uid", uid]
    );
  } catch {
    return null;
  }
}

export async function collectNotes(
  startMs: number,
  endMs: number,
  cache: TimelineCache,
  maxBlocks: number,
  minChars: number,
  regexExclusion: string,
  onlyDailyPages: boolean
): Promise<NoteLocation[]> {
  const changed = queryChangedBlocks(startMs, endMs);

  const sorted = changed.sort((a, b) => b[1] - a[1]).slice(0, Math.max(50, maxBlocks * 8));
  // Build this from all changed rows in range (not just the limited candidate set),
  // otherwise a changed ancestor can be dropped before parent walking.
  const changedUids = new Set(changed.map(([uid]) => uid));
  const parentCache = new Map<string, TopBlockInfo>();
  const topEditTime = new Map<string, number>();
  const topPage = new Map<string, string>();

  for (const [uid, et] of sorted) {
    const top = topLevelForBlock(uid, changedUids, parentCache);
    if (!top) {
      continue;
    }
    if (onlyDailyPages && !(isDailyPageTitle(top.pageTitle) || isDailyPageUid(top.pageUid))) {
      continue;
    }
    const existing = topEditTime.get(top.topUid);
    if (!existing || et > existing) {
      topEditTime.set(top.topUid, et);
      topPage.set(top.topUid, top.pageTitle);
    }
  }

  const notes: NoteLocation[] = [];
  for (const [topUid, editTime] of topEditTime.entries()) {
    if (notes.length >= maxBlocks) {
      break;
    }

    const tree = pullBlockTree(topUid);
    if (!tree) {
      continue;
    }
    const topText = firstMeaningfulText(tree);
    if (!isMeaningful(topText, minChars, regexExclusion)) {
      continue;
    }

    const matrixTs = findMatrixTimestampInTree(tree);
    const effectiveTs = matrixTs ?? editTime;
    const point = nearestTimelinePoint(cache.points, effectiveTs);
    if (!point) {
      continue;
    }

    const place = nearestFrequentPlace(point, cache.frequentPlaces);
    const placeLabel = place && place.dist <= 250 ? place.label || "Frequent place" : undefined;

    notes.push({
      topUid,
      pageTitle: topPage.get(topUid) || "",
      topText,
      effectiveTs,
      source: matrixTs ? "matrix" : "edit-time",
      editTime,
      matrixTime: matrixTs || undefined,
      point,
      placeLabel,
      placeDistanceMeters: place?.dist,
    });
  }

  notes.sort((a, b) => b.effectiveTs - a.effectiveTs);

  return notes;
}
