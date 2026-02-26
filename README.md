# Roam Map View Plugin

Roam extension that maps recent notes to locations from Google `Timeline.json`.

## What it does

- Imports Google `Timeline.json` (manual file upload)
- Parses and caches timeline points in IndexedDB for reuse
- Lets you choose time ranges (24h/3d/7d/custom)
- Pulls blocks edited in that range
- Clusters noisy child edits to a single top-level block per hierarchy subtree
- Uses `timestamp::DD/MM/YYYY HH:mm:ss` from block subtree when present (for Matrix-imported notes)
- Maps each note to the nearest timeline location point by timestamp
- Renders note blocks in the side panel using Roam native block renderer
- Shows markers on a map (Leaflet + marker clustering)

## Install / build

1. In this folder, install deps:

```bash
npm install
```

2. Build:

```bash
npm run build
```

3. Run unit tests:

```bash
npm test
```

4. Run typecheck + tests + build:

```bash
npm run validate
```

3. In Roam > Extensions, load this folder as a local extension (it will use `extension.js`).

## Usage

1. Run command palette: `Map View: Open notes timeline map`
2. Select your `Timeline.json` file and click `Import Timeline.json`
3. Set time range + filters
4. Click `Refresh`

## Notes on filtering and clustering

- Hierarchy clustering: if multiple changed blocks are under the same top-level block, only one card/marker is shown.
- Default filtering removes obvious metadata/noise (`URL::`, `author::`, `timestamp::`) and very short text.
- You can add custom exclusion regex in the panel or in extension settings.

## Unit test coverage

Current tests cover:

- Lat/lng parsing from timeline coordinates
- Matrix timestamp parsing
- Note text normalization and filtering rules
- Daily page title detection and first meaningful text extraction
- Timeline cache extraction/sorting
- Nearest timeline point and frequent-place matching
- Nested matrix timestamp discovery in block trees
- `collectNotes` behavior:
  - child-edit clustering to top-level blocks
  - daily-page-only filtering
  - matrix timestamp override and place labeling

## Source layout

- `src/index.tsx`: extension entrypoint + React modal mounting
- `src/roam/notes.ts`: Roam block traversal/query and note collection logic
- `src/timeline/cache.ts`: timeline parsing and nearest-point matching
- `src/timeline/db.ts`: IndexedDB cache persistence
- `src/lib/*`: pure utility modules (geo/time/text/matrix parsing)
- `src/ui/MapViewModal.tsx`: React UI for controls, list, and map interactions
- `src/ui/NativeBlock.tsx`: Roam native block rendering wrapper component
- `src/ui/components/*`: split React UI pieces (`ControlsPanel`, `NotesList`, `MapPane`)
- `src/ui/styles.ts`, `src/ui/leaflet.ts`: style + Leaflet loader helpers

## Data handling

- Cache is local to the browser profile (IndexedDB key: `roam-map-view-db`).
- No timeline data is sent anywhere by this plugin.
