import { formatTs } from "../../lib/time";
import type { NoteLocation } from "../../types";

type Props = {
  notes: NoteLocation[];
  emptyMessage: string;
  onHover: (uid: string | null) => void;
  onFocus: (uid: string) => void;
  registerCardRef: (uid: string, el: HTMLDivElement | null) => void;
};

export function NotesList({ notes, emptyMessage, onHover, onFocus, registerCardRef }: Props) {
  return (
    <div className="rmv-list">
      {notes.length === 0 ? (
        <div className="rmv-card-meta">{emptyMessage}</div>
      ) : (
        notes.map((note) => {
          const loc = `${note.point.lat.toFixed(5)}, ${note.point.lng.toFixed(5)}`;
          const label = note.placeLabel ? `${note.placeLabel} • ` : "";
          const previewText = note.topText?.trim() || `((${note.topUid}))`;
          return (
            <div
              key={note.topUid}
              className="rmv-card"
              ref={(el) => registerCardRef(note.topUid, el)}
              onMouseEnter={() => onHover(note.topUid)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onFocus(note.topUid)}
            >
              <div className="rmv-card-meta">
                {`${formatTs(note.effectiveTs)} • ${note.pageTitle} • ${label}${loc} • ${note.source}`}
              </div>
              <div className="rmv-note-preview">{previewText}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
