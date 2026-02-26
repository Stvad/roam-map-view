import { useRef } from "react";

type Props = {
  preset: string;
  startValue: string;
  endValue: string;
  maxNotes: string;
  minChars: string;
  excludeRegex: string;
  onlyDailyPages: boolean;
  onPresetChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onMaxNotesChange: (value: string) => void;
  onMinCharsChange: (value: string) => void;
  onExcludeRegexChange: (value: string) => void;
  onOnlyDailyPagesChange: (value: boolean) => void;
  onImport: (file: File | null) => void;
  onRefresh: () => void;
};

export function ControlsPanel({
  preset,
  startValue,
  endValue,
  maxNotes,
  minChars,
  excludeRegex,
  onlyDailyPages,
  onPresetChange,
  onStartChange,
  onEndChange,
  onMaxNotesChange,
  onMinCharsChange,
  onExcludeRegexChange,
  onOnlyDailyPagesChange,
  onImport,
  onRefresh,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rmv-controls">
      <div className="rmv-row">
        <input ref={fileInputRef} type="file" accept="application/json,.json" />
        <button className="rmv-primary" onClick={() => onImport(fileInputRef.current?.files?.[0] ?? null)}>
          Import Timeline.json
        </button>
      </div>

      <div className="rmv-row">
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
          <option value="24">Last 24h</option>
          <option value="72">Last 3 days</option>
          <option value="168">Last 7 days</option>
          <option value="336">Last 14 days</option>
          <option value="custom">Custom</option>
        </select>
        <button className="rmv-primary" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="rmv-row">
        <input type="datetime-local" value={startValue} onChange={(e) => onStartChange(e.target.value)} />
        <input type="datetime-local" value={endValue} onChange={(e) => onEndChange(e.target.value)} />
      </div>

      <div className="rmv-row">
        <input
          type="number"
          min={20}
          max={2000}
          placeholder="Max notes"
          value={maxNotes}
          onChange={(e) => onMaxNotesChange(e.target.value)}
        />
        <input
          type="number"
          min={2}
          max={200}
          placeholder="Min chars"
          value={minChars}
          onChange={(e) => onMinCharsChange(e.target.value)}
        />
      </div>

      <div className="rmv-row">
        <input
          type="text"
          placeholder="Exclude regex (optional)"
          value={excludeRegex}
          onChange={(e) => onExcludeRegexChange(e.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
          <input
            type="checkbox"
            style={{ width: "16px" }}
            checked={onlyDailyPages}
            onChange={(e) => onOnlyDailyPagesChange(e.target.checked)}
          />
          <span>Only daily pages</span>
        </label>
      </div>
    </div>
  );
}
