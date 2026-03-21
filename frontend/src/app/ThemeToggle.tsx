import { useTheme } from "./theme";

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ThemeToggle = () => {
  const { effectiveTheme, setPreference } = useTheme();
  const nextTheme = effectiveTheme === "light" ? "dark" : "light";
  const label = nextTheme === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${effectiveTheme}`}
      aria-label={label}
      aria-pressed={effectiveTheme === "dark"}
      onClick={() => setPreference(nextTheme)}
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        <SunIcon />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        <MoonIcon />
      </span>
      <span className="theme-toggle__thumb" aria-hidden="true" />
    </button>
  );
};

export default ThemeToggle;
