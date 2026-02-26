export type ExtensionAPI = {
  settings: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => Promise<void> | void;
    panel: {
      create: (cfg: unknown) => void;
    };
  };
  ui: {
    commandPalette: {
      addCommand: (cfg: { label: string; callback: () => void | Promise<void> }) => unknown;
    };
  };
};

export type TimelinePoint = {
  ts: number;
  lat: number;
  lng: number;
  source: string;
  accuracyMeters?: number;
};

export type FrequentPlace = {
  lat: number;
  lng: number;
  label?: string;
};

export type TimelineCache = {
  version: 1;
  importedAt: number;
  points: TimelinePoint[];
  frequentPlaces: FrequentPlace[];
};

export type TopBlockInfo = {
  topUid: string;
  pageTitle: string;
  pageUid: string;
};

export type NoteLocation = {
  topUid: string;
  pageTitle: string;
  topText: string;
  effectiveTs: number;
  source: "matrix" | "edit-time";
  editTime: number;
  matrixTime?: number;
  point: TimelinePoint;
  placeLabel?: string;
  placeDistanceMeters?: number;
};

declare global {
  interface Window {
    roamAlphaAPI: any;
    L: any;
  }
}

export {};
