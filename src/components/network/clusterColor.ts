/**
 * Deterministic cluster color derived from a company name.
 *
 * Same input → same hue across re-renders and across all nodes (company,
 * contacts, jobs) belonging to the same cluster. Returns HSL components so
 * callers can compose backgrounds, borders, and shadows at varying alpha.
 */
export function clusterHue(companyName: string | undefined | null): number | null {
  if (!companyName) return null;
  const key = companyName.toLowerCase().trim();
  if (!key) return null;
  // Simple FNV-1a-ish hash → 0..359
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

/** Background tint for cluster avatars (low saturation, light/dark adaptive via card bg). */
export function clusterTintBg(hue: number | null): string | undefined {
  if (hue == null) return undefined;
  return `hsl(${hue} 70% 92% / 0.85)`;
}

/** Stronger accent for the cluster center/company node. */
export function clusterAccentBg(hue: number | null): string | undefined {
  if (hue == null) return undefined;
  return `hsl(${hue} 65% 88%)`;
}

/** Soft glow shadow for cluster cohesion. */
export function clusterGlow(hue: number | null): string | undefined {
  if (hue == null) return undefined;
  return `0 0 0 2px hsl(${hue} 60% 70% / 0.35)`;
}
