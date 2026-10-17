"use client";

import { useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";
const STORAGE_KEY = "sps-theme";
const CHANGE_EVENT = "sps-theme-change";
let transientPreference: ThemePreference = "system";

function getPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : transientPreference;
  } catch {
    return transientPreference;
  }
}

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    applyTheme(getPreference());
    callback();
  };
  window.addEventListener("storage", sync);
  window.addEventListener(CHANGE_EVENT, sync);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(CHANGE_EVENT, sync);
    media.removeEventListener("change", sync);
  };
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => "system" as ThemePreference,
  );
  function change(value: ThemePreference) {
    transientPreference = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* Apply even when browser storage is unavailable. */
    }
    applyTheme(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return (
    <label className="theme-toggle" title="Appearance">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {preference === "dark" ? (
          <path d="M20.7 13.2A8.8 8.8 0 0 1 10.8 3.3 9 9 0 1 0 20.7 13.2Z" />
        ) : preference === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </>
        )}
      </svg>
      <select
        aria-label="Color theme"
        value={preference}
        onChange={(event) => change(event.target.value as ThemePreference)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <svg
        className="theme-chevron"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="m3 4.5 3 3 3-3" />
      </svg>
    </label>
  );
}
