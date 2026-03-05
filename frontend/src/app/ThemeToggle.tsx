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

  const options = [
    { value: "light", label: "Modo claro", Icon: SunIcon },
    { value: "dark", label: "Modo oscuro", Icon: MoonIcon },
  ] as const;

  return (
    <div className="theme-toggle" role="group" aria-label="Modo de color">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className={effectiveTheme === value ? "theme-toggle__btn is-active" : "theme-toggle__btn"}
          aria-pressed={effectiveTheme === value}
          aria-label={label}
          onClick={() => setPreference(value)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
