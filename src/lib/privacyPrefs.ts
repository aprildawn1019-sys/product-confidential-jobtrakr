// Privacy preferences: small client-side toggles persisted in localStorage.
//
// We keep these in localStorage (not the DB) because:
//   • They're per-device viewing prefs, not per-account data.
//   • They need to be readable synchronously during the first render of
//     ContactAvatar so we never momentarily flash a proxied photo.
//   • No round-trip means no flicker on reload.
import { useEffect, useState } from "react";

const STORAGE_KEY = "jobtrakr.privacy.disableLinkedInAvatars";
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
