import { createRoot, type Root } from "react-dom/client";
import { MapViewModal } from "./ui/MapViewModal";
import { ensureStyles, getModalId, removeStyles } from "./ui/styles";
import type { ExtensionAPI } from "./types";

let extensionApiRef: ExtensionAPI | null = null;
let containerEl: HTMLDivElement | null = null;
let reactRoot: Root | null = null;
let refreshHandler: (() => void) | null = null;

function createSettingsPanel(api: ExtensionAPI): void {
  api.settings.panel.create({
    tabTitle: "Map View",
    settings: [
      {
        id: "lookback-hours",
        name: "Default lookback hours",
        description: "Time range preset used when opening the map view.",
        action: { type: "input", placeholder: "72" },
      },
      {
        id: "max-notes",
        name: "Max notes",
        description: "Upper bound for displayed clustered notes.",
        action: { type: "input", placeholder: "400" },
      },
      {
        id: "min-chars",
        name: "Min meaningful chars",
        description: "Filter out very short/noisy block text.",
        action: { type: "input", placeholder: "10" },
      },
      {
        id: "exclude-regex",
        name: "Exclude regex",
        description: "Optional regex to hide noisy notes (applies to top block text).",
        action: { type: "input", placeholder: "^(URL::|author::|timestamp::)" },
      },
      {
        id: "only-daily-pages",
        name: "Only daily pages by default",
        description: "When true, only daily note pages are included initially.",
        action: { type: "switch" },
      },
    ],
  });
}

function closeModal(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (containerEl) {
    containerEl.remove();
    containerEl = null;
  }
  refreshHandler = null;
}

function registerRefreshHandler(handler: (() => void) | null): void {
  refreshHandler = handler;
}

function openModal(): void {
  if (!extensionApiRef) {
    return;
  }

  if (containerEl) {
    containerEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  ensureStyles();
  containerEl = document.createElement("div");
  containerEl.id = getModalId();
  document.body.appendChild(containerEl);

  reactRoot = createRoot(containerEl);
  reactRoot.render(
    <MapViewModal api={extensionApiRef} onClose={closeModal} registerRefreshHandler={registerRefreshHandler} />
  );
}

async function onload({ extensionAPI }: { extensionAPI: ExtensionAPI }): Promise<void> {
  console.info("[roam-map-view] onload start");
  extensionApiRef = extensionAPI;
  (window as any).__roamMapView = { loaded: true, commandsRegistered: false };
  createSettingsPanel(extensionAPI);

  extensionAPI.ui.commandPalette.addCommand({
    label: "Map View: Open notes timeline map",
    callback: () => {
      openModal();
    },
  });

  extensionAPI.ui.commandPalette.addCommand({
    label: "Map View: Refresh open map",
    callback: () => {
      refreshHandler?.();
    },
  });
  (window as any).__roamMapView.commandsRegistered = true;
  console.info("[roam-map-view] commands registered");
}

function onunload(): void {
  console.info("[roam-map-view] onunload");
  closeModal();
  removeStyles();
  extensionApiRef = null;
}

export default {
  onload,
  onunload,
};
