"use client";

import { useSyncExternalStore } from "react";

export type ThemeName = "light" | "dark";

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("chaze-theme", theme);
  window.dispatchEvent(new CustomEvent("chaze-theme-change", { detail: theme }));
}

function useTheme() {
  const theme = useSyncExternalStore(
    (notify) => { window.addEventListener("chaze-theme-change", notify); return () => window.removeEventListener("chaze-theme-change", notify); },
    () => document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    () => "light" as ThemeName,
  );
  return [theme, applyTheme] as const;
}

function ThemeIcon({ theme }: { theme: ThemeName }) {
  return theme === "dark"
    ? <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.5 15.5A9 9 0 0 1 8.5 3.5 9 9 0 1 0 20.5 15.5Z"/></svg>
    : <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return <button type="button" onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-3 font-semibold text-action shadow-card hover:bg-subtle"><ThemeIcon theme={theme}/><span className="hidden sm:inline">{theme === "light" ? "Light" : "Dark"}</span></button>;
}

export function ThemeSelector() {
  const [theme, setTheme] = useTheme();
  return <fieldset><legend className="font-semibold">Color theme</legend><div className="mt-4 grid gap-4 sm:grid-cols-2">{(["light","dark"] as const).map((choice)=><button key={choice} type="button" aria-pressed={theme === choice} onClick={() => setTheme(choice)} className={`flex min-h-24 items-center justify-center gap-3 rounded-card border p-5 text-lg font-semibold shadow-card ${theme === choice ? "border-action bg-subtle text-action" : "border-border bg-surface text-ink"}`}><ThemeIcon theme={choice}/>{choice === "light" ? "Light mode" : "Dark mode"}</button>)}</div></fieldset>;
}
