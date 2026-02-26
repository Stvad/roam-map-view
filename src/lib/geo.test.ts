import { describe, expect, it } from "vitest";
import { haversineMeters, parseLatLng } from "./geo";

describe("parseLatLng", () => {
  it("parses Google LatLng strings", () => {
    expect(parseLatLng("48.8119638°, 2.4139053°")).toEqual({ lat: 48.8119638, lng: 2.4139053 });
  });

  it("returns null for malformed values", () => {
    expect(parseLatLng("invalid")).toBeNull();
    expect(parseLatLng(undefined)).toBeNull();
  });
});

describe("haversineMeters", () => {
  it("computes plausible distance", () => {
    const d = haversineMeters({ lat: 48, lng: 2 }, { lat: 48.001, lng: 2.001 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });
});
