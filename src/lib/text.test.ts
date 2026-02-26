import { describe, expect, it } from "vitest";
import { firstMeaningfulText, isDailyPageTitle, isDailyPageUid, isMeaningful, normalizedText } from "./text";

describe("normalizedText", () => {
  it("normalizes roam syntax and urls", () => {
    const result = normalizedText("[[hello]] {{[[TODO]]}} https://example.com #tag");
    expect(result).toBe("hello tag");
  });
});

describe("isMeaningful", () => {
  it("keeps meaningful content", () => {
    expect(isMeaningful("Switch aws to store card", 8, "")).toBe(true);
  });

  it("filters metadata and regex-excluded text", () => {
    expect(isMeaningful("timestamp::24/02/2026 11:09:03", 2, "")).toBe(false);
    expect(isMeaningful("Random note", 2, "random")).toBe(false);
  });

  it("filters short content", () => {
    expect(isMeaningful("ok", 5, "")).toBe(false);
  });
});

describe("firstMeaningfulText", () => {
  it("falls back to meaningful child when root is metadata", () => {
    const node = {
      ":block/string": "URL::https://example.com",
      ":block/children": [
        { ":block/string": "timestamp::24/02/2026 11:09:03" },
        { ":block/string": "Useful summary line" },
      ],
    };
    expect(firstMeaningfulText(node)).toBe("Useful summary line");
  });
});

describe("isDailyPageTitle", () => {
  it("matches daily note titles", () => {
    expect(isDailyPageTitle("February 24th, 2026")).toBe(true);
    expect(isDailyPageTitle("March 1st, 2026")).toBe(true);
  });

  it("rejects non-daily titles", () => {
    expect(isDailyPageTitle("Project Phoenix")).toBe(false);
    expect(isDailyPageTitle("2026-02-24")).toBe(false);
  });
});

describe("isDailyPageUid", () => {
  it("matches Roam daily page UIDs", () => {
    expect(isDailyPageUid("02-24-2026")).toBe(true);
  });

  it("rejects non-daily UIDs", () => {
    expect(isDailyPageUid("abc123xyz")).toBe(false);
    expect(isDailyPageUid("2026-02-24")).toBe(false);
  });
});
