const MODAL_ID = "roam-map-view-modal";
const STYLE_ID = "roam-map-view-style";

export function getModalId(): string {
  return MODAL_ID;
}

export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${MODAL_ID} {
      position: fixed;
      inset: 16px;
      z-index: 10000;
      background: #f7f8fb;
      border: 1px solid #d7dae0;
      border-radius: 10px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
      display: grid;
      grid-template-rows: auto 1fr;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${MODAL_ID} .rmv-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid #dde1ea;
      background: #ffffff;
    }
    #${MODAL_ID} .rmv-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    #${MODAL_ID} .rmv-status {
      font-size: 12px;
      color: #334155;
      margin-left: 8px;
      font-weight: 500;
    }
    #${MODAL_ID} .rmv-close {
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 8px;
      cursor: pointer;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
    }
    #${MODAL_ID} .rmv-body {
      display: grid;
      grid-template-columns: 420px 1fr;
      min-height: 0;
      min-width: 0;
    }
    #${MODAL_ID} .rmv-side {
      border-right: 1px solid #dde1ea;
      background: #fff;
      display: grid;
      grid-template-rows: auto 1fr;
      min-height: 0;
    }
    #${MODAL_ID} .rmv-controls {
      padding: 12px;
      display: grid;
      gap: 8px;
      border-bottom: 1px solid #f0f2f7;
    }
    #${MODAL_ID} .rmv-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #${MODAL_ID} .rmv-field {
      display: grid;
      gap: 4px;
    }
    #${MODAL_ID} .rmv-label {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      line-height: 1.2;
    }
    #${MODAL_ID} input,
    #${MODAL_ID} select,
    #${MODAL_ID} button {
      width: 100%;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
      box-sizing: border-box;
    }
    #${MODAL_ID} .rmv-primary {
      background: #0b5fff;
      border-color: #0b5fff;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    #${MODAL_ID} .rmv-list {
      overflow: auto;
      padding: 10px;
      display: grid;
      gap: 8px;
      align-content: start;
      grid-auto-rows: max-content;
      max-height: 55%;
    }
    #${MODAL_ID} .rmv-card {
      border: 1px solid #dbe1ec;
      border-radius: 8px;
      background: #f8fafc;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      min-height: 58px;
      cursor: pointer;
      overflow: hidden;
    }
    #${MODAL_ID} .rmv-card:hover {
      border-color: #0b5fff;
      background: #f0f6ff;
    }
    #${MODAL_ID} .rmv-card-meta {
      font-size: 11px;
      color: #334155;
      line-height: 1.3;
      word-break: break-word;
    }
    #${MODAL_ID} .rmv-note-preview {
      font-size: 13px;
      line-height: 1.35;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: 1.35em;
    }
    #${MODAL_ID} .rmv-preview {
      border-top: 1px solid #e2e8f0;
      padding: 10px;
      display: grid;
      gap: 6px;
      min-height: 160px;
      background: #fff;
    }
    #${MODAL_ID} .rmv-native-preview {
      border: 1px solid #dbe1ec;
      border-radius: 8px;
      background: #f8fafc;
      padding: 8px;
      max-height: 220px;
      overflow: auto;
      position: relative;
      isolation: isolate;
    }
    #${MODAL_ID} .rmv-native-preview .rm-block-main,
    #${MODAL_ID} .rmv-native-preview .rm-block__self {
      position: static !important;
      transform: none !important;
      margin: 0 !important;
    }
    #${MODAL_ID} .leaflet-popup-content {
      margin: 8px 10px;
    }
    #${MODAL_ID} .leaflet-popup-content .rmv-popup {
      min-width: 260px;
      max-width: 430px;
      display: grid;
      gap: 2px;
      font-size: 13px;
      line-height: 1.35;
    }
    #${MODAL_ID} .leaflet-popup-content .rmv-popup-native {
      margin-top: 4px;
      border: 1px solid #dbe1ec;
      border-radius: 8px;
      background: #f8fafc;
      padding: 4px;
      max-height: 180px;
      overflow: auto;
      position: relative;
      isolation: isolate;
    }
    #${MODAL_ID} .leaflet-popup-content .rmv-popup-native .rm-block-main,
    #${MODAL_ID} .leaflet-popup-content .rmv-popup-native .rm-block__self {
      position: static !important;
      transform: none !important;
      margin: 0 !important;
    }
    #${MODAL_ID} .leaflet-popup-content .rmv-popup-edit-time {
      margin-top: 0;
      font-size: 11px;
      color: #475569;
    }
    #${MODAL_ID} .rmv-map {
      position: relative;
      min-height: 0;
      min-width: 0;
    }
    #${MODAL_ID} .rmv-map #roam-map-view-map {
      height: 100%;
      width: 100%;
    }
    @media (max-width: 1200px) {
      #${MODAL_ID} {
        inset: 8px;
      }
      #${MODAL_ID} .rmv-body {
        grid-template-columns: 360px 1fr;
      }
    }
    @media (max-width: 900px) {
      #${MODAL_ID} .rmv-body {
        grid-template-columns: 1fr;
        grid-template-rows: 52% 48%;
      }
      #${MODAL_ID} .rmv-side {
        border-right: none;
        border-bottom: 1px solid #dde1ea;
      }
    }
  `;
  document.head.appendChild(style);
}

export function removeStyles(): void {
  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }
}
