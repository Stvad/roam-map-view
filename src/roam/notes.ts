import { findMatrixTimestampInTree } from "../lib/matrix";
import { firstMeaningfulText, isDailyPageTitle, isMeaningful } from "../lib/text";
import { nearestFrequentPlace, nearestTimelinePoint } from "../timeline/cache";
import type { NoteLocation, TimelineCache, TopBlockInfo } from "../types";

function immediateParent(uid: string): { uid: string; pageTitle?: string } | null {
  const result = window.roamAlphaAPI.q(
    `[:find ?puid ?title
      :in $ ?uid
      :where
      [?c :block/uid ?uid]
      [?p :block/children ?c]
      [?p :block/uid ?puid]
      [(get-else $ ?p :node/title nil) ?title]]`,
    uid
  ) as [string, string | null][];

  if (!result?.length) {
    return null;
  }
  const [puid, title] = result[0];
  return { uid: puid, pageTitle: title ?? undefined };
}

function topLevelForBlock(uid: string, cache: Map<string, TopBlockInfo>): TopBlockInfo | null {
  if (cache.has(uid)) {
    return cache.get(uid) || null;
  }

  let current = uid;
  let depth = 0;
  while (depth < 200) {
    const parent = immediateParent(current);
    if (!parent) {
      return null;
    }
    if (parent.pageTitle) {
      const info = { topUid: current, pageTitle: parent.pageTitle };
      cache.set(uid, info);
      return info;
    }
    current = parent.uid;
    depth += 1;
  }
  return null;
}

function pullBlockTree(uid: string): any | null {
  try {
    return window.roamAlphaAPI.pull(
      "[:block/uid :block/string :block/edit-time {:block/children ...}]",
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
  const changed = window.roamAlphaAPI.q(
    `[:find ?uid ?et
      :in $ ?start ?end
      :where
      [?b :block/uid ?uid]
      [?b :block/edit-time ?et]
      [(>= ?et ?start)]
      [(<= ?et ?end)]]`,
    startMs,
    endMs
  ) as [string, number][];

  const sorted = (changed || []).sort((a, b) => b[1] - a[1]).slice(0, Math.max(50, maxBlocks * 8));
  const parentCache = new Map<string, TopBlockInfo>();
  const topEditTime = new Map<string, number>();
  const topPage = new Map<string, string>();

  for (const [uid, et] of sorted) {
    const top = topLevelForBlock(uid, parentCache);
    if (!top) {
      continue;
    }
    if (onlyDailyPages && !isDailyPageTitle(top.pageTitle)) {
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
