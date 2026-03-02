import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type Theme, type ThemePreference } from "./context";

const THEME_STORAGE_KEY = "arenas.theme";

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getInitialPreference = (): ThemePreference => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => getInitialPreference());
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());

  const effectiveTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = effectiveTheme;
  }, [effectiveTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      effectiveTheme,
      setPreference,
      cyclePreference: () => {
        setPreference((current) => {
          if (current === "light") return "dark";
          if (current === "dark") return "system";
          return "light";
        });
      },
    }),
    [preference, effectiveTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
