function ensureCss(href: string): void {
  if ([...document.querySelectorAll("link[rel='stylesheet']")].some((l) => (l as HTMLLinkElement).href === href)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

async function loadScript(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if ([...document.querySelectorAll("script")].some((s) => s.src === src)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function ensureLeaflet(): Promise<void> {
  if (window.L) {
    return;
  }
  ensureCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
  ensureCss("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
  ensureCss("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");
  await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  await loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");
}
