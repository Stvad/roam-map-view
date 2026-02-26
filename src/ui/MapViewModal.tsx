import { useCallback, useEffect, useRef, useState } from "react";
import { nowMinusHours, toLocalDatetimeValue } from "../lib/time";
import { collectNotes } from "../roam/notes";
import { buildTimelineCache } from "../timeline/cache";
import { readCache, writeCache } from "../timeline/db";
import type { ExtensionAPI, NoteLocation } from "../types";
import { ControlsPanel } from "./components/ControlsPanel";
import { MapPane, type FocusTarget } from "./components/MapPane";
import { NotesList } from "./components/NotesList";

type Props = {
  api: ExtensionAPI;
  onClose: () => void;
  registerRefreshHandler: (handler: (() => void) | null) => void;
};

const PRESETS = ["24", "72", "168", "336"];

export function MapViewModal({ api, onClose, registerRefreshHandler }: Props) {
  const lookbackHours = Number(api.settings.get("lookback-hours") || 72);
  const defaultPreset = PRESETS.includes(String(lookbackHours)) ? String(lookbackHours) : "custom";

  const [status, setStatus] = useState("Idle");
  const [notes, setNotes] = useState<NoteLocation[]>([]);
  const [preset, setPreset] = useState(defaultPreset);
  const [startValue, setStartValue] = useState(toLocalDatetimeValue(nowMinusHours(lookbackHours)));
  const [endValue, setEndValue] = useState(toLocalDatetimeValue(new Date()));
  const [maxNotes, setMaxNotes] = useState(String(Number(api.settings.get("max-notes") || 400)));
  const [minChars, setMinChars] = useState(String(Number(api.settings.get("min-chars") || 10)));
  const [excludeRegex, setExcludeRegex] = useState(String(api.settings.get("exclude-regex") || ""));
  const [onlyDailyPages, setOnlyDailyPages] = useState(Boolean(api.settings.get("only-daily-pages") ?? true));
  const [hoverUid, setHoverUid] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  const focusSeqRef = useRef(0);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerCardRef = useCallback((uid: string, el: HTMLDivElement | null): void => {
    if (el) {
      cardRefs.current.set(uid, el);
    } else {
      cardRefs.current.delete(uid);
    }
  }, []);

  const focusUid = useCallback((uid: string): void => {
    focusSeqRef.current += 1;
    setFocusTarget({ uid, seq: focusSeqRef.current });
  }, []);

  const persistSettings = useCallback(async (): Promise<void> => {
    await api.settings.set("max-notes", Number(maxNotes) || 400);
    await api.settings.set("min-chars", Number(minChars) || 10);
    await api.settings.set("exclude-regex", excludeRegex || "");
    await api.settings.set("only-daily-pages", onlyDailyPages);
    await api.settings.set(
      "lookback-hours",
      Math.max(1, Math.round((new Date(endValue).getTime() - new Date(startValue).getTime()) / 3600000))
    );
  }, [api, endValue, excludeRegex, maxNotes, minChars, onlyDailyPages, startValue]);

  const refreshView = useCallback(async (): Promise<void> => {
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      setStatus("Invalid time range.");
      return;
    }

    const cache = await readCache();
    if (!cache || !cache.points.length) {
      setStatus("Upload Timeline.json first.");
      return;
    }

    const maxBlocks = Math.max(20, Math.min(2000, Number(maxNotes) || 400));
    const minCharsNum = Math.max(2, Math.min(200, Number(minChars) || 10));

    setStatus("Querying notes...");
    const result = await collectNotes(start, end, cache, maxBlocks, minCharsNum, excludeRegex.trim(), onlyDailyPages);
    setNotes(result);
    setStatus(`Showing ${result.length} notes.`);
    void persistSettings();
  }, [endValue, excludeRegex, maxNotes, minChars, onlyDailyPages, persistSettings, startValue]);

  const importTimeline = useCallback(
    async (file: File | null): Promise<void> => {
      if (!file) {
        setStatus("Select Timeline.json file first.");
        return;
      }

      setStatus("Importing Timeline.json...");
      const text = await file.text();
      const json = JSON.parse(text);
      const cache = buildTimelineCache(json);
      await writeCache(cache);
      await api.settings.set("cache-meta", {
        importedAt: cache.importedAt,
        pointCount: cache.points.length,
        frequentPlaceCount: cache.frequentPlaces.length,
      });
      setStatus(
        `Imported ${cache.points.length.toLocaleString()} points, ${cache.frequentPlaces.length.toLocaleString()} frequent places.`
      );
    },
    [api]
  );

  const applyPreset = useCallback((nextPreset: string): void => {
    setPreset(nextPreset);
    if (nextPreset === "custom") {
      return;
    }
    const hours = Number(nextPreset);
    if (!Number.isFinite(hours)) {
      return;
    }
    const end = new Date();
    const start = nowMinusHours(hours);
    setStartValue(toLocalDatetimeValue(start));
    setEndValue(toLocalDatetimeValue(end));
  }, []);

  const handleMarkerClick = useCallback(
    (uid: string): void => {
      focusUid(uid);
      const card = cardRefs.current.get(uid);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [focusUid]
  );

  const handleMapReady = useCallback((): void => {
    const meta = api.settings.get("cache-meta") as { importedAt?: number; pointCount?: number } | undefined;
    if (meta?.importedAt) {
      setStatus(
        `Timeline cache: ${meta.pointCount?.toLocaleString() || "?"} points (imported ${new Date(meta.importedAt).toLocaleString()}).`
      );
    } else {
      setStatus("Upload Timeline.json to start.");
    }
  }, [api]);

  useEffect(() => {
    registerRefreshHandler(() => {
      void refreshView();
    });
    return () => registerRefreshHandler(null);
  }, [refreshView, registerRefreshHandler]);

  useEffect(() => {
    setStatus("Loading map...");
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <>
      <div className="rmv-header">
        <div>
          <span className="rmv-title">Roam Map View</span>
          <span className="rmv-status">{status}</span>
        </div>
        <button className="rmv-close" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="rmv-body">
        <div className="rmv-side">
          <ControlsPanel
            preset={preset}
            startValue={startValue}
            endValue={endValue}
            maxNotes={maxNotes}
            minChars={minChars}
            excludeRegex={excludeRegex}
            onlyDailyPages={onlyDailyPages}
            onPresetChange={applyPreset}
            onStartChange={setStartValue}
            onEndChange={setEndValue}
            onMaxNotesChange={setMaxNotes}
            onMinCharsChange={setMinChars}
            onExcludeRegexChange={setExcludeRegex}
            onOnlyDailyPagesChange={setOnlyDailyPages}
            onImport={(file) => {
              void importTimeline(file);
            }}
            onRefresh={() => {
              void refreshView();
            }}
          />

          <NotesList
            notes={notes}
            onHover={setHoverUid}
            onFocus={focusUid}
            registerCardRef={registerCardRef}
          />
        </div>

        <MapPane
          notes={notes}
          hoverUid={hoverUid}
          focusTarget={focusTarget}
          onMarkerClick={handleMarkerClick}
          onReady={handleMapReady}
          onError={setStatus}
        />
      </div>
    </>
  );
}
