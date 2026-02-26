import { describe, expect, it } from "vitest";
import { buildTimelineCache, nearestFrequentPlace, nearestTimelinePoint } from "./cache";

describe("buildTimelineCache", () => {
  it("extracts/sorts points and frequent places", () => {
    const cache = buildTimelineCache({
      rawSignals: [
        {
          position: {
            LatLng: "48.0001°, 2.0001°",
            timestamp: "2026-02-24T11:09:03.000+01:00",
            source: "GPS",
            accuracyMeters: 12,
          },
        },
        {
          position: {
            LatLng: "48.0000°, 2.0000°",
            timestamp: "2026-02-24T11:00:03.000+01:00",
            source: "WIFI",
          },
        },
        { wifiScan: { deliveryTime: "2026-02-24T11:00:03.000+01:00" } },
      ],
      userLocationProfile: {
        frequentPlaces: [
          { placeLocation: "48.0000°, 2.0000°", label: "HOME" },
          { placeLocation: "bad-value" },
        ],
      },
    });

    expect(cache.points).toHaveLength(2);
    expect(cache.points[0].source).toBe("WIFI");
    expect(cache.points[1].source).toBe("GPS");
    expect(cache.frequentPlaces).toEqual([{ lat: 48, lng: 2, label: "HOME" }]);
  });
});

describe("nearest timeline matching", () => {
  const points = [
    { ts: 1_000, lat: 48.0, lng: 2.0, source: "GPS" },
    { ts: 2_000, lat: 48.1, lng: 2.1, source: "GPS" },
    { ts: 3_000, lat: 48.2, lng: 2.2, source: "GPS" },
  ];

  it("finds nearest point by timestamp", () => {
    const nearest = nearestTimelinePoint(points, 2_200);
    expect(nearest?.ts).toBe(2_000);
  });

  it("returns nearest frequent place with distance", () => {
    const match = nearestFrequentPlace(points[1], [
      { lat: 48.1001, lng: 2.1001, label: "WORK" },
      { lat: 49, lng: 3, label: "OTHER" },
    ]);
    expect(match?.label).toBe("WORK");
    expect(match?.dist).toBeLessThan(30);
  });
});
