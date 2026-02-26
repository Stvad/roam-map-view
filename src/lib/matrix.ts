import { parseMatrixTimestamp } from "./time";

export function findMatrixTimestampInTree(node: any): number | null {
  const stack: any[] = [node];
  while (stack.length) {
    const cur = stack.pop();
    const s = cur?.[":block/string"];
    if (typeof s === "string") {
      const m = s.match(/(?:^|\n)\s*timestamp::\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i);
      if (m) {
        const ts = parseMatrixTimestamp(m[1].trim());
        if (ts) {
          return ts;
        }
      }
    }
    const children = cur?.[":block/children"];
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i -= 1) {
        stack.push(children[i]);
      }
    }
  }
  return null;
}
