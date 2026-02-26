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
    if (query.includes(":find ?puid ?title")) {
      const uid = String(arg);
      const p = parents[uid];
      return p ? [[p.uid, p.title ?? null]] : [];
    }
    throw new Error(`Unexpected query: ${query}`);
  });

  const pull = vi.fn((_pattern: string, lookup: [string, string]) => {
    const uid = lookup[1];
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
    installRoamMock({
      changed: [
        ["child-A", 5000],
        ["child-B", 4000],
        ["child-C", 3000],
      ],
      parents: {
        "child-A": { uid: "top-A" },
        "child-B": { uid: "top-A" },
        "child-C": { uid: "top-B" },
        "top-A": { uid: "page-daily", title: "February 24th, 2026" },
        "top-B": { uid: "page-daily-2", title: "February 23rd, 2026" },
      },
      trees: {
        "top-A": { ":block/string": "Top A summary", ":block/children": [] },
        "top-B": { ":block/string": "Top B summary", ":block/children": [] },
      },
    });

    const result = await collectNotes(
      0,
      10_000,
      cache([
        { ts: 3000, lat: 48.0, lng: 2.0, source: "GPS" },
        { ts: 5000, lat: 48.1, lng: 2.1, source: "GPS" },
      ]),
      100,
      4,
      "",
      false
    );

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.topUid === "top-A")?.editTime).toBe(5000);
    expect(result.filter((r) => r.topUid === "top-A")).toHaveLength(1);
  });

  it("filters to daily pages when requested", async () => {
    installRoamMock({
      changed: [
        ["daily-child", 5000],
        ["proj-child", 4000],
      ],
      parents: {
        "daily-child": { uid: "top-daily" },
        "proj-child": { uid: "top-proj" },
        "top-daily": { uid: "page-daily", title: "February 24th, 2026" },
        "top-proj": { uid: "page-project", title: "Project Phoenix" },
      },
      trees: {
        "top-daily": { ":block/string": "Daily note", ":block/children": [] },
        "top-proj": { ":block/string": "Project note", ":block/children": [] },
      },
    });

    const result = await collectNotes(
      0,
      10_000,
      cache([
        { ts: 4000, lat: 48.0, lng: 2.0, source: "GPS" },
        { ts: 5000, lat: 48.1, lng: 2.1, source: "GPS" },
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
        "top-1": { uid: "page-daily", title: "February 24th, 2026" },
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
});
