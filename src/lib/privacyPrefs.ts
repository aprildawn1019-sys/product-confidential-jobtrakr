// Privacy preferences: small client-side toggles persisted in localStorage.
//
// We keep these in localStorage (not the DB) because:
//   • They're per-device viewing prefs, not per-account data.
//   • They need to be readable synchronously during the first render of
//     ContactAvatar so we never momentarily flash a proxied photo.
//   • No round-trip means no flicker on reload.
import { useEffect, useState } from "react";

const STORAGE_KEY = "jobtrakr.privacy.disableLinkedInAvatars";
// `useAvatarProxy` defaults to TRUE — newly imported contacts route their
// LinkedIn photo through our edge-function proxy + storage cache so the
// browser never hot-links `media.licdn.com` (which 403s third parties).
// We store the *inverse* ("disable…") so an absent localStorage key reads
// as the secure-by-default behavior (proxying ON).
const PROXY_DISABLED_KEY = "jobtrakr.privacy.disableAvatarProxy";
// `denseAvatarTooltips` defaults to TRUE — error/privacy tooltips on
// ContactAvatar are shown even in dense lists. Stored as the inverse
// ("hide…") so an absent key keeps the prior, more discoverable behavior.
const HIDE_DENSE_TOOLTIPS_KEY = "jobtrakr.privacy.hideDenseAvatarTooltips";
// Custom event name used to broadcast changes within the same tab.
// `storage` events only fire across tabs, so we add our own.
const EVENT_NAME = "jobtrakr:privacy-changed";

/** Read the current value (safe to call during render). */
export function getDisableLinkedInAvatars(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Write the value and notify in-tab subscribers. */
export function setDisableLinkedInAvatars(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* localStorage unavailable — ignore */
  }
}

/**
 * Read whether avatar proxying is enabled. Defaults to TRUE — only
 * returns false when the user has explicitly opted out via Settings.
 *
 * Safe to call during render and from non-React modules (e.g. dialog
 * handlers that invoke the edge function before mount).
 */
export function getUseAvatarProxy(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PROXY_DISABLED_KEY) !== "true";
  } catch {
    return true;
  }
}

/**
 * Toggle avatar proxying. Pass `true` to enable proxying (default),
 * `false` to send raw LinkedIn URLs straight to the contact record.
 */
export function setUseAvatarProxy(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    // Store the inverse so the absence of the key = proxying enabled.
    window.localStorage.setItem(PROXY_DISABLED_KEY, value ? "false" : "true");
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* localStorage unavailable — ignore */
  }
}

/**
 * Read whether ContactAvatar should attach explanatory tooltips when
 * rendered in a "dense" surface (contact tables, sidebars, kanban
 * cards). Defaults to TRUE; users can flip it off when the tooltips
 * feel noisy.
 */
export function getDenseAvatarTooltips(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HIDE_DENSE_TOOLTIPS_KEY) !== "true";
  } catch {
    return true;
  }
}

/**
 * Toggle dense-list avatar tooltips. `true` = show tooltips even in
 * dense surfaces (default), `false` = suppress them in dense contexts.
 * Non-dense usages (large profile cards) always keep their tooltips.
 */
export function setDenseAvatarTooltips(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    // Inverse storage so an absent key = tooltips visible.
    window.localStorage.setItem(HIDE_DENSE_TOOLTIPS_KEY, value ? "false" : "true");
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* localStorage unavailable — ignore */
  }
}

/**
 * React hook that returns the current "disable LinkedIn avatars" preference
 * and re-renders subscribers whenever it changes (in this tab or others).
 */
export function useDisableLinkedInAvatars(): boolean {
  const [value, setValue] = useState<boolean>(() => getDisableLinkedInAvatars());

  useEffect(() => {
    const sync = () => setValue(getDisableLinkedInAvatars());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  return value;
}

/**
 * React hook mirroring `getUseAvatarProxy` with cross-tab sync. Returns
 * `true` by default — flip to `false` only after the user opts out.
 */
export function useUseAvatarProxy(): boolean {
  const [value, setValue] = useState<boolean>(() => getUseAvatarProxy());

  useEffect(() => {
    const sync = () => setValue(getUseAvatarProxy());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  return value;
}

/** Hook form of `getDenseAvatarTooltips`. */
export function useDenseAvatarTooltips(): boolean {
  const [value, setValue] = useState<boolean>(() => getDenseAvatarTooltips());

  useEffect(() => {
    const sync = () => setValue(getDenseAvatarTooltips());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  return value;
}
