import { describe, expect, it } from "vitest";
import { findMatrixTimestampInTree } from "./matrix";

describe("findMatrixTimestampInTree", () => {
  it("finds timestamp in nested tree", () => {
    const tree = {
      ":block/string": "Parent note",
      ":block/children": [
        { ":block/string": "author::[[@stvad:matrix.org]]" },
        {
          ":block/string": "timestamp::24/02/2026 11:09:03",
          ":block/children": [],
        },
      ],
    };

    const expected = new Date("2026-02-24T11:09:03").getTime();
    expect(findMatrixTimestampInTree(tree)).toBe(expected);
  });

  it("returns null when timestamp is missing", () => {
    const tree = {
      ":block/string": "No timestamp",
      ":block/children": [{ ":block/string": "author::[[@foo:matrix.org]]" }],
    };
    expect(findMatrixTimestampInTree(tree)).toBeNull();
  });
});
