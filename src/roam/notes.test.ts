import { afterEach, describe, expect, it, vi } from "vitest";
import { collectNotes } from "./notes";
import type { TimelineCache } from "../types";

type ParentInfo = { uid: string; title?: string };

type RoamMockInput = {
  changed: Array<[string, number]>;
  parents: Record<string, ParentInfo | undefined>;
  trees: Record<string, any>;
};

function installRoamMock({ changed, parents, trees }: RoamMockInput): void {
  const q = vi.fn((query: string, arg?: unknown) => {
    if (query.includes(":find ?uid ?et")) {
      return changed;
    }
    if (query.includes(":find ?puid")) {
      const uid = String(arg);
      const p = parents[uid];
      return p ? [[p.uid]] : [];
    }
    throw new Error(`Unexpected query: ${query}`);
  });

  const pull = vi.fn((pattern: string, lookup: [string, string]) => {
    const uid = lookup[1];
    if (pattern.includes(":node/title")) {
      const owner = parents[uid];
      return owner?.title ? { ":node/title": owner.title } : {};
    }
    return trees[uid] ?? null;
  });

  (globalThis as any).window = {
    roamAlphaAPI: {
      q,
      pull,
    },
  };
}

function cache(points: Array<{ ts: number; lat: number; lng: number; source: string }>): TimelineCache {
  return {
    version: 1,
    importedAt: Date.now(),
    points,
    frequentPlaces: [{ lat: points[0]?.lat ?? 0, lng: points[0]?.lng ?? 0, label: "HOME" }],
  };
}

afterEach(() => {
  delete (globalThis as any).window;
  vi.restoreAllMocks();
});

describe("collectNotes", () => {
  it("clusters changed child blocks to one top-level note", async () => {
    const tA = 1_708_772_945_000;
    const tB = 1_708_772_944_000;
    const tC = 1_708_772_943_000;
    installRoamMock({
      changed: [
        ["child-A", tA],
        ["child-B", tB],
        ["child-C", tC],
      ],
      parents: {
        "child-A": { uid: "top-A" },
        "child-B": { uid: "top-A" },
        "child-C": { uid: "top-B" },
        "top-A": { uid: "page-daily" },
        "top-B": { uid: "page-daily-2" },
        "page-daily": { uid: "graph-root", title: "February 24th, 2026" },
        "page-daily-2": { uid: "graph-root", title: "February 23rd, 2026" },
      },
      trees: {
        "top-A": { ":block/string": "Top A summary", ":block/children": [] },
        "top-B": { ":block/string": "Top B summary", ":block/children": [] },
      },
    });

    const result = await collectNotes(
      0,
      tA + 10_000,
      cache([
        { ts: tC, lat: 48.0, lng: 2.0, source: "GPS" },
        { ts: tA, lat: 48.1, lng: 2.1, source: "GPS" },
      ]),
      100,
      4,
      "",
      false
    );

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.topUid === "top-A")?.editTime).toBe(tA);
    expect(result.filter((r) => r.topUid === "top-A")).toHaveLength(1);
  });

  it("filters to daily pages when requested", async () => {
    const tDaily = 1_708_772_945_000;
    const tProj = 1_708_772_944_000;
    installRoamMock({
      changed: [
        ["daily-child", tDaily],
        ["proj-child", tProj],
      ],
      parents: {
        "daily-child": { uid: "top-daily" },
        "proj-child": { uid: "top-proj" },
        "top-daily": { uid: "02-24-2026" },
        "top-proj": { uid: "page-project" },
        // Non-English title still qualifies via daily page UID.
        "02-24-2026": { uid: "graph-root", title: "24 février 2026" },
        "page-project": { uid: "graph-root", title: "Project Phoenix" },
      },
      trees: {
        "top-daily": { ":block/string": "Daily note", ":block/children": [] },
        "top-proj": { ":block/string": "Project note", ":block/children": [] },
      },
    });

    const result = await collectNotes(
      0,
      tDaily + 10_000,
      cache([
        { ts: tProj, lat: 48.0, lng: 2.0, source: "GPS" },
        { ts: tDaily, lat: 48.1, lng: 2.1, source: "GPS" },
      ]),
      100,
      4,
      "",
      true
    );

    expect(result).toHaveLength(1);
    expect(result[0].topUid).toBe("top-daily");
  });

  it("uses matrix timestamp override and computes place label", async () => {
    installRoamMock({
      changed: [["child-1", 5000]],
      parents: {
        "child-1": { uid: "top-1" },
        "top-1": { uid: "page-daily" },
        "page-daily": { uid: "graph-root", title: "February 24th, 2026" },
      },
      trees: {
        "top-1": {
          ":block/string": "Matrix imported note",
          ":block/children": [
            { ":block/string": "author::[[@stvad:matrix.org]]" },
            { ":block/string": "timestamp::24/02/2026 11:09:03" },
          ],
        },
      },
    });

    const matrixTs = new Date("2026-02-24T11:09:03").getTime();

    const result = await collectNotes(
      0,
      10_000,
      {
        version: 1,
        importedAt: Date.now(),
        points: [
          { ts: matrixTs, lat: 48.8119, lng: 2.4139, source: "GPS" },
          { ts: 5000, lat: 10, lng: 10, source: "GPS" },
        ],
        frequentPlaces: [{ lat: 48.8119, lng: 2.4139, label: "HOME" }],
      },
      100,
      4,
      "",
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("matrix");
    expect(result[0].effectiveTs).toBe(matrixTs);
    expect(result[0].point.lat).toBeCloseTo(48.8119, 5);
    expect(result[0].placeLabel).toBe("HOME");
  });

  it("falls back to microsecond query window and normalizes edit-time", async () => {
    const q = vi.fn((query: string, a?: unknown, b?: unknown) => {
      if (query.includes(":find ?uid ?et")) {
        const end = Number(b);
        // Return rows only for microsecond-range query attempt.
        if (end > 1e15) {
          return [["child-1", 1_708_772_943_000_000]];
        }
        return [];
      }
      if (query.includes(":find ?puid")) {
        const uid = String(a);
        if (uid === "child-1") return [["top-1"]];
        if (uid === "top-1") return [["02-24-2026"]];
        return [];
      }
      return [];
    });

    const pull = vi.fn((pattern: string, lookup: [string, string]) => {
      const uid = lookup[1];
      if (pattern.includes(":node/title")) {
        if (uid === "02-24-2026") return { ":node/title": "24 février 2026" };
        return {};
      }
      if (uid === "top-1") {
        return { ":block/string": "Some recent note", ":block/children": [] };
      }
      return null;
    });

    (globalThis as any).window = { roamAlphaAPI: { q, pull } };

    const result = await collectNotes(
      new Date("2024-02-24T00:00:00Z").getTime(),
      new Date("2024-02-25T00:00:00Z").getTime(),
      cache([{ ts: 1_708_772_943_000, lat: 48.8119, lng: 2.4139, source: "GPS" }]),
      100,
      4,
      "",
      true
    );

    expect(result).toHaveLength(1);
    // Normalized from microseconds to milliseconds.
    expect(result[0].editTime).toBe(1_708_772_943_000);
  });
});
