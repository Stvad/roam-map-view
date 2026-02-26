import { useEffect, useRef } from "react";
import { formatTs } from "../../lib/time";
import type { NoteLocation } from "../../types";
import { ensureLeaflet } from "../leaflet";

export type FocusTarget = {
  uid: string;
  seq: number;
};

type Props = {
  notes: NoteLocation[];
  hoverUid: string | null;
  focusTarget: FocusTarget | null;
  onMarkerClick: (uid: string) => void;
  onReady: () => void;
  onError: (message: string) => void;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function MapPane({ notes, hoverUid, focusTarget, onMarkerClick, onReady, onError }: Props) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const markersByUidRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    let canceled = false;

    const init = async (): Promise<void> => {
      try {
        await ensureLeaflet();
      } catch (e) {
        if (!canceled) {
          onError(`Map library failed to load: ${(e as Error).message}`);
        }
        return;
      }

      if (canceled || !mapElRef.current) {
        return;
      }

      const L = window.L;
      mapRef.current = L.map(mapElRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
      mapRef.current.setView([48.8119, 2.4134], 12);
      onReady();
    };

    void init();

    return () => {
      canceled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
      }
      markersByUidRef.current.clear();
      markerLayerRef.current = null;
      mapRef.current = null;
    };
  }, [onError, onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) {
      return;
    }

    if (markerLayerRef.current) {
      map.removeLayer(markerLayerRef.current);
      markerLayerRef.current = null;
    }
    markersByUidRef.current.clear();

    if (!notes.length) {
      return;
    }

    const L = window.L;
    const layer = typeof L.markerClusterGroup === "function" ? L.markerClusterGroup() : L.layerGroup();
    const bounds: [number, number][] = [];

    for (const note of notes) {
      const loc = `${note.point.lat.toFixed(5)}, ${note.point.lng.toFixed(5)}`;
      const preview = note.topText.length > 220 ? `${note.topText.slice(0, 220)}…` : note.topText;
      const marker = L.marker([note.point.lat, note.point.lng]);
      marker.bindPopup(
        `<div style="min-width:240px;max-width:380px"><strong>${escapeHtml(note.pageTitle)}</strong><br/>${escapeHtml(formatTs(note.effectiveTs))}<br/>${escapeHtml(loc)}<div style="margin-top:6px;line-height:1.35">${escapeHtml(preview)}</div></div>`
      );
      marker.on("click", () => onMarkerClick(note.topUid));

      layer.addLayer(marker);
      markersByUidRef.current.set(note.topUid, marker);
      bounds.push([note.point.lat, note.point.lng]);
    }

    map.addLayer(layer);
    markerLayerRef.current = layer;
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }

    return () => {
      if (map && layer) {
        map.removeLayer(layer);
      }
      if (markerLayerRef.current === layer) {
        markerLayerRef.current = null;
      }
      markersByUidRef.current.clear();
    };
  }, [notes, onMarkerClick]);

  useEffect(() => {
    if (!hoverUid) {
      return;
    }
    const marker = markersByUidRef.current.get(hoverUid);
    marker?.openPopup();
  }, [hoverUid]);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    const marker = markersByUidRef.current.get(focusTarget.uid);
    const map = mapRef.current;
    if (marker && map) {
      const ll = marker.getLatLng();
      map.setView([ll.lat, ll.lng], Math.max(15, map.getZoom()));
      marker.openPopup();
    }
  }, [focusTarget]);

  return (
    <div className="rmv-map">
      <div id="roam-map-view-map" ref={mapElRef} />
    </div>
  );
}
