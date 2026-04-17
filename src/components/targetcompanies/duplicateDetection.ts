import type { TargetCompany } from "@/types/jobTracker";

/** Normalize a company name for clustering. Mirrors logic in jobTrackerStore but more aggressive on suffixes. */
export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[,.\u2019']/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(inc|incorporated|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|group|plc|lp|gmbh|ag|sa|srl|pty|holdings|the)\b/gi, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Extract a normalized domain from a website URL (host without www, no path). */
export function extractDomain(url?: string | null): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Cluster target companies into groups of likely-duplicates.
 * Returns only clusters with 2+ members. Stable order: oldest createdAt first within each cluster.
 */
export function detectDuplicateClusters(companies: TargetCompany[]): TargetCompany[][] {
  const byKey = new Map<string, TargetCompany[]>();
  const byDomain = new Map<string, TargetCompany[]>();

  for (const c of companies) {
    const key = normalizeCompanyName(c.name);
    if (key) {
      const arr = byKey.get(key) ?? [];
      arr.push(c);
      byKey.set(key, arr);
    }
    const domain = extractDomain(c.website);
    if (domain) {
      const arr = byDomain.get(domain) ?? [];
      arr.push(c);
      byDomain.set(domain, arr);
    }
  }

  // Union-find to merge name-key clusters with domain clusters
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (!p || p === x) { parent.set(x, x); return x; }
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const c of companies) parent.set(c.id, c.id);

  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) union(group[0].id, group[i].id);
  }
  for (const group of byDomain.values()) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) union(group[0].id, group[i].id);
  }

  const groups = new Map<string, TargetCompany[]>();
  for (const c of companies) {
    const root = find(c.id);
    const arr = groups.get(root) ?? [];
    arr.push(c);
    groups.set(root, arr);
  }

  return Array.from(groups.values())
    .filter(g => g.length >= 2)
    .map(g => [...g].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}
