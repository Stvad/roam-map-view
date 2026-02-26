export function normalizedText(s: string): string {
  return s
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*_`>~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMeaningful(text: string, minChars: number, regexExclusion: string): boolean {
  const t = text.trim();
  if (!t) {
    return false;
  }
  if (/^(URL::|author::|timestamp::)/i.test(t)) {
    return false;
  }
  if (regexExclusion) {
    try {
      const rx = new RegExp(regexExclusion, "i");
      if (rx.test(t)) {
        return false;
      }
    } catch {
      // Ignore invalid regex and keep data visible.
    }
  }
  const n = normalizedText(t);
  if (n.length < minChars) {
    return false;
  }
  return /[a-z0-9]/i.test(n);
}

export function firstMeaningfulText(node: any): string {
  const root = (node?.[":block/string"] || "").trim();
  if (isMeaningful(root, 4, "")) {
    return root;
  }
  const stack: any[] = [...(node?.[":block/children"] || [])];
  while (stack.length) {
    const cur = stack.shift();
    const s = (cur?.[":block/string"] || "").trim();
    if (isMeaningful(s, 4, "")) {
      return s;
    }
    const children = cur?.[":block/children"];
    if (Array.isArray(children)) {
      stack.push(...children);
    }
  }
  return root;
}

export function isDailyPageTitle(title: string): boolean {
  return /^[A-Z][a-z]+\s+\d{1,2}(st|nd|rd|th),\s+\d{4}$/.test(title);
}
