import { createContext } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export type ThemeContextValue = {
  preference: ThemePreference;
  effectiveTheme: Theme;
  setPreference: (preference: ThemePreference) => void;
  cyclePreference: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
