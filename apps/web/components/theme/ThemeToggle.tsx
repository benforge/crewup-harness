"use client";

import { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

const storageKey = "project-web-theme";

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const initial = stored === "dark" || stored === "light" ? stored : getSystemTheme();
    setTheme(initial);
    applyTheme(initial);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(storageKey)) return;
      const nextTheme = event.matches ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const nextTheme = useMemo(() => (theme === "dark" ? "light" : "dark"), [theme]);

  return (
    <button
      aria-label={ready ? `切换到${nextTheme === "dark" ? "深色" : "浅色"}主题` : "主题切换"}
      aria-pressed={theme === "dark"}
      className="inline-flex min-h-10 min-w-[92px] cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--rule)] bg-[var(--surface-raised)] px-3 text-[13px] font-[750] text-[var(--ink)] transition-colors duration-150 ease-[var(--ease-quiet)] hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--rule))] hover:text-[var(--accent)] max-[720px]:w-fit"
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        window.localStorage.setItem(storageKey, next);
        setTheme(next);
        applyTheme(next);
      }}
    >
      <span className="[&_svg]:size-[18px]" aria-hidden="true">
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
      <span>{theme === "dark" ? "浅色" : "深色"}</span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.75 2.75a8.5 8.5 0 1 0 5.5 13.86A9.7 9.7 0 0 1 15.75 2.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5M18.2 18.2l-1.5-1.5M7.3 7.3 5.8 5.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
